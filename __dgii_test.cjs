/**
 * DGII Certification End-to-End Test
 * Parses the test Excel, imports all cases to ECF API, sends them in DGII order,
 * and reports final acceptance status.
 */
const XLSX = require('./node_modules/xlsx');
const https = require('https');
const http = require('http');
const path = require('path');

const ECF_BASE = 'https://ecf.villarja.com';
const API_KEY = 'vja_cert_5rkMIitIEsq9Ewmt29wHaVGO';
const EXCEL_PATH = 'C:/Users/edwin/Downloads/02600932293-09062026232754.xlsx';

// ─── helpers ──────────────────────────────────────────────────────────────────

function normalizeKey(k) {
  return k
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '');
}

function apireq(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(ECF_BASE + urlPath);
    const isHttps = url.protocol === 'https:';
    const opts = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    };
    const bodyStr = body ? JSON.stringify(body) : null;
    if (bodyStr) opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);

    const lib = isHttps ? https : http;
    const req = lib.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function pad(s, n) { return String(s).padEnd(n); }

function statusIcon(estado) {
  if (!estado) return '⏳';
  const e = estado.toLowerCase();
  if (e === 'accepted') return '✅';
  if (e === 'error') return '❌';
  if (e === 'sent') return '📤';
  if (e === 'pending') return '⏳';
  return '❓';
}

// ─── parse Excel ──────────────────────────────────────────────────────────────

function parseExcel(filePath) {
  const wb = XLSX.readFile(filePath);

  const normalizeRow = (row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      const nk = normalizeKey(k);
      out[nk] = v === '#e' ? undefined : v;
    }
    return out;
  };

  const ws0 = wb.Sheets[wb.SheetNames[0]];
  const ecfRows = XLSX.utils.sheet_to_json(ws0, { defval: '#e', raw: false }).map(normalizeRow);

  let rfceRows = [];
  if (wb.SheetNames[1]) {
    const ws1 = wb.Sheets[wb.SheetNames[1]];
    rfceRows = XLSX.utils.sheet_to_json(ws1, { defval: '#e', raw: false }).map(normalizeRow);
  }

  console.log(`\nExcel parsed: ${ecfRows.length} ECF cases, ${rfceRows.length} RFCE cases`);
  return [...ecfRows, ...rfceRows];
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log(' DGII Certification Test — certecf ambiente');
  console.log('═══════════════════════════════════════════');

  // 1. Parse Excel
  const allCases = parseExcel(EXCEL_PATH);

  // 2. Reset / delete existing cases
  console.log('\n[1] Eliminando casos existentes...');
  const del = await apireq('DELETE', '/api/v1/certification/cases');
  console.log(`    → ${del.status} ${JSON.stringify(del.body).slice(0, 80)}`);

  // 3. Import test cases
  console.log('\n[2] Importando casos desde Excel...');
  const imp = await apireq('POST', '/api/v1/certification/cases', { cases: allCases });
  console.log(`    → ${imp.status} ${JSON.stringify(imp.body).slice(0, 120)}`);
  if (imp.status >= 400) {
    console.error('    ✗ Import falló. Abortando.');
    process.exit(1);
  }

  // 4. List cases in DGII send order
  console.log('\n[3] Obteniendo lista de casos en orden DGII...');
  const list = await apireq('GET', '/api/v1/certification/cases');
  if (list.status >= 400 || !list.body.data) {
    console.error('    ✗ No se pudo obtener la lista:', JSON.stringify(list.body));
    process.exit(1);
  }
  const cases = list.body.data;
  console.log(`    → ${cases.length} casos listos para envío`);

  // Print table header
  console.log('\n' + '─'.repeat(90));
  console.log(
    pad('Grupo', 7) + pad('eNCF', 20) + pad('Tipo', 6) + pad('Canal', 7) +
    pad('Monto', 14) + pad('Estado Inicial', 16) + 'Estado Final'
  );
  console.log('─'.repeat(90));

  // 5. Send all cases sequentially in DGII order
  const results = [];
  let currentGroup = null;

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const grupo = c.is_rfce ? 3 : (c.tipo_ecf === 33 || c.tipo_ecf === 34 ? 2 : 1);
    const canal = c.is_rfce ? 'RFCE' : 'ECF';
    const encf = c.encf || c.caso_prueba || '?';

    if (grupo !== currentGroup) {
      const labels = {
        1: 'GRUPO 1 — T31/T32≥250K/T41/T43/T44/T45/T46/T47',
        2: 'GRUPO 2 — T33 Nota Débito / T34 Nota Crédito',
        3: 'GRUPO 3/4 — T32 RFCE + Factura Consumo <250K',
      };
      console.log('\n  ' + labels[grupo]);
      currentGroup = grupo;
    }

    process.stdout.write(
      pad('  G' + grupo, 7) + pad(encf, 20) + pad('T' + c.tipo_ecf, 6) +
      pad(canal, 7) + pad(c.monto_total || '', 14) + pad(c.estado, 16)
    );

    // Send
    const send = await apireq('POST', `/api/v1/certification/cases/${c.id}/send`);
    let finalEstado = send.body?.data?.estado || send.body?.estado || (send.status >= 400 ? 'error' : 'sent');
    let errorMsg = send.body?.error || send.body?.message || send.body?.data?.error_msg || '';
    if (!errorMsg && send.status >= 400) errorMsg = `HTTP ${send.status}: ${JSON.stringify(send.body).slice(0, 120)}`;

    // If still 'sent', do an extra check poll
    if (finalEstado === 'sent' && send.status < 400) {
      await sleep(2000);
      const chk = await apireq('POST', `/api/v1/certification/cases/${c.id}/check`);
      finalEstado = chk.body?.data?.estado || chk.body?.estado || finalEstado;
      errorMsg = chk.body?.data?.error_msg || chk.body?.error || errorMsg;
    }

    const icon = statusIcon(finalEstado);
    const errSnip = errorMsg ? ` — ${String(errorMsg).slice(0, 60)}` : '';
    console.log(`${icon} ${finalEstado}${errSnip}`);

    results.push({ encf, tipo: c.tipo_ecf, canal, estado: finalEstado, error: errorMsg });

    // Brief pause between sends to avoid overwhelming DGII
    if (i < cases.length - 1) await sleep(1000);
  }

  // 6. Summary
  const accepted = results.filter((r) => r.estado === 'accepted').length;
  const errors = results.filter((r) => r.estado === 'error' || r.estado === 'rejected').length;
  const pending = results.length - accepted - errors;

  console.log('\n' + '═'.repeat(90));
  console.log(` RESUMEN: ${accepted}/${results.length} aceptados | ${errors} rechazados | ${pending} pendientes`);
  console.log('═'.repeat(90));

  if (errors > 0) {
    console.log('\n❌ Casos rechazados:');
    results.filter((r) => r.estado === 'error' || r.estado === 'rejected').forEach((r) => {
      console.log(`  ${r.encf} (T${r.tipo}/${r.canal}): ${r.error}`);
    });
  }

  if (accepted === results.length) {
    console.log('\n🎉 ¡Todos los casos fueron aceptados por la DGII!');
  }
}

main().catch((err) => {
  console.error('\n✗ Error fatal:', err.message || err);
  process.exit(1);
});
