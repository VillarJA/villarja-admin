'use client';

/**
 * CertificacionModal
 *
 * Allows an admin to:
 * 1. Upload the DGII-provided Excel test set (.xlsx).
 *    The Excel is parsed client-side with the `xlsx` library.
 *    Parsed rows are sent to the ECF API (POST /certification/cases) which
 *    stores them verbatim — no portal sequences are consumed.
 * 2. See all test cases grouped by DGII send order.
 * 3. Send each case individually (or run all pending ones sequentially).
 * 4. See DGII responses per case (trackId, error).
 *    After send, the backend auto-polls DGII up to 3 × 1.5 s — most cases
 *    resolve to accepted/rejected without any extra user action.
 * 5. Reset all cases back to pending (manual or automatic on error).
 *
 * DGII required send order:
 *   Grupo 1 — tipos 31, 32 ≥ RD$250K, 41, 43, 44, 45, 46, 47
 *   Grupo 2 — tipos 33, 34 (notas)
 *   Grupo 3 — tipo 32 < RD$250K (RFCE primero, luego full)
 */

import { useState, useRef, useCallback } from 'react';
import { Icon } from '@/components/Icons';
import type { Company } from '@/types';
import * as XLSX from 'xlsx';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CertCase {
  id: string;
  caso_prueba: string;
  tipo_ecf: number;
  encf: string;
  estado: 'pending' | 'sent' | 'accepted' | 'rejected' | 'error';
  track_id: string | null;
  error_msg: string | null;
  sent_at: string | null;
  is_rfce: boolean;
}

type Step = 'upload' | 'cases';

const ECF_LABELS: Record<number, string> = {
  31: 'Crédito Fiscal',
  32: 'Consumo',
  33: 'Nota Débito',
  34: 'Nota Crédito',
  41: 'Compras',
  43: 'Gastos Menores',
  44: 'Reg. Especiales',
  45: 'Gubernamental',
  46: 'Exportaciones',
  47: 'Pag. Exterior',
};

const ESTADO_LABEL: Record<CertCase['estado'], { label: string; cls: string }> = {
  pending:  { label: 'Pendiente', cls: 'draft' },
  sent:     { label: 'Enviado',   cls: 'info' },
  accepted: { label: 'Aceptado',  cls: 'ok' },
  rejected: { label: 'Rechazado', cls: 'err' },
  error:    { label: 'Error',     cls: 'err' },
};

// Groups match DGII required send order
const GROUP_LABELS: Record<number, string> = {
  1: 'Primero — 31 · 32 ≥ RD$250K · 41 · 43 · 44 · 45 · 46 · 47',
  2: 'Segundo — 33 Nota Débito · 34 Nota Crédito',
  3: 'Tercero/Cuarto — 32 RFCE + Factura Consumo < RD$250K',
};

function getCaseGroup(c: CertCase): number {
  if (c.is_rfce) return 3;
  if (c.tipo_ecf === 33 || c.tipo_ecf === 34) return 2;
  return 1;
}

interface Props {
  company: Company;
  onClose: () => void;
}

// ─── Excel parser ──────────────────────────────────────────────────────────────

function parseExcelTestSet(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        // Sheet 1 = main ECF cases; Sheet 2 = RFCE-only subset (read both)
        const allRows: Record<string, unknown>[] = [];
        for (let i = 0; i < Math.min(wb.SheetNames.length, 2); i++) {
          const ws = wb.Sheets[wb.SheetNames[i]];
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
            defval: '#e',
            raw: false,
          });
          allRows.push(...rows);
        }
        resolve(allRows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CertificacionModal({ company, onClose }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [cases, setCases] = useState<CertCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const apiKey = company.apiKey ?? '';

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  // ── Fetch cases from API ──
  const fetchCases = useCallback(async () => {
    try {
      const res = await fetch('/api/certification/cases', {
        headers: { 'x-api-key': apiKey },
      });
      const json = await res.json();
      if (res.ok) {
        setCases(json.data ?? json ?? []);
      }
    } catch {
      // non-fatal
    }
  }, [apiKey]);

  // ── Auto-check: poll DGII for final state after async send ──
  const autoCheckCase = useCallback(async (id: string) => {
    for (let i = 0; i < 3; i++) {
      await new Promise<void>((resolve) => setTimeout(resolve, 2000));
      setCheckingId(id);
      try {
        const res = await fetch(`/api/certification/cases/${id}/check`, {
          method: 'POST',
          headers: { 'x-api-key': apiKey },
        });
        const json = await res.json();
        await fetchCases();
        // Stop polling once we have a final state
        if (res.ok && json.data?.estado !== 'sent') {
          setCheckingId(null);
          return;
        }
      } catch {
        // continue
      }
      setCheckingId(null);
    }
  }, [apiKey, fetchCases]);

  // ── Upload Excel and import ──
  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const rows = await parseExcelTestSet(file);
      if (rows.length === 0) {
        setError('El archivo no contiene casos de prueba.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/certification/cases', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cases: rows }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Error al importar los casos');
        setLoading(false);
        return;
      }
      showToast(json.message ?? `${rows.length} casos importados`);
      await fetchCases();
      setStep('cases');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al parsear el Excel');
    } finally {
      setLoading(false);
    }
  }

  // ── Load cases view ──
  async function handleViewCases() {
    setLoading(true);
    await fetchCases();
    setLoading(false);
    setStep('cases');
  }

  // ── Send one case ──
  async function handleSendCase(id: string) {
    setRunningId(id);
    setError('');
    try {
      const res = await fetch(`/api/certification/cases/${id}/send`, {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Error al enviar el caso');
        await fetchCases();
      } else {
        showToast(json.message ?? `Enviado: ${json.data?.encf ?? ''}`);
        await fetchCases();
        setRunningId(null);
        // If backend couldn't resolve status (async DGII), auto-poll frontend-side
        if (json.data?.estado === 'sent') {
          await autoCheckCase(id);
          return;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red');
    } finally {
      setRunningId(null);
    }
  }

  // ── Send all pending sequentially (respects DGII group order from backend) ──
  async function handleSendAll() {
    setRunningAll(true);
    setError('');
    await fetchCases();
    const pending = cases.filter((c) => c.estado === 'pending');
    for (const c of pending) {
      setRunningId(c.id);
      const res = await fetch(`/api/certification/cases/${c.id}/send`, {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `Error al enviar ${c.encf}`);
        await fetchCases();
        setRunningId(null);
        setRunningAll(false);
        return;
      }
      await fetchCases();
      // If async, wait for resolution before sending next
      if (json.data?.estado === 'sent') {
        setRunningId(null);
        await autoCheckCase(c.id);
      }
    }
    setRunningId(null);
    setRunningAll(false);
    showToast('Todos los casos enviados');
  }

  // ── Download XML for a single case ──
  async function downloadXml(id: string, encf: string, tipo: number, isRfce: boolean) {
    try {
      const res = await fetch(`/api/certification/cases/${id}/xml`, {
        headers: { 'x-api-key': apiKey },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? 'Error al descargar XML');
        return;
      }
      const xml = await res.text();
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${encf}_T${tipo}${isRfce ? '_RFCE' : ''}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar XML');
    }
  }

  // ── Download all accepted cases as individual XMLs ──
  async function handleDownloadAll() {
    setError('');
    const accepted = cases.filter((c) => c.estado === 'accepted' || c.estado === 'sent');
    for (const c of accepted) {
      await downloadXml(c.id, c.encf, c.tipo_ecf, c.is_rfce);
      await new Promise<void>((r) => setTimeout(r, 350));
    }
    showToast(`${accepted.length} XML descargados`);
  }

  // ── Reset all ──
  async function handleReset() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/certification/reset', {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
      });
      const json = await res.json();
      if (res.ok) {
        showToast(json.message ?? 'Casos reiniciados');
        await fetchCases();
      } else {
        setError(json.error ?? 'Error al reiniciar');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red');
    } finally {
      setLoading(false);
    }
  }

  // ── Bulk manual verify (fallback for cases stuck in 'sent') ──
  async function handleCheckAll() {
    setError('');
    const sent = cases.filter((c) => c.estado === 'sent');
    for (const c of sent) {
      setCheckingId(c.id);
      try {
        const res = await fetch(`/api/certification/cases/${c.id}/check`, {
          method: 'POST',
          headers: { 'x-api-key': apiKey },
        });
        const json = await res.json();
        if (!res.ok && json.error) { setError(json.error); break; }
      } catch { /* continue */ }
      await fetchCases();
      setCheckingId(null);
    }
    showToast('Estados verificados');
  }

  // ── Summary counts ──
  const counts = cases.reduce(
    (acc, c) => { acc[c.estado] = (acc[c.estado] ?? 0) + 1; return acc; },
    {} as Record<string, number>,
  );

  const sentCount = counts['sent'] ?? 0;
  const expandedCase = expandedErrorId ? cases.find((c) => c.id === expandedErrorId) : null;

  // ── Group cases for table rendering ──
  type GroupRow = { group: number; cases: CertCase[] };
  const groupedCases = cases.reduce((acc: GroupRow[], c) => {
    const g = getCaseGroup(c);
    const last = acc[acc.length - 1];
    if (!last || last.group !== g) acc.push({ group: g, cases: [c] });
    else last.cases.push(c);
    return acc;
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'var(--overlay)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card"
        style={{
          width: '100%', maxWidth: 860, maxHeight: '92vh',
          display: 'flex', flexDirection: 'column', gap: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Icon name="shield" size={20} style={{ color: 'var(--brand)' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                Set de Pruebas DGII
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {company.razon} — Certificación certeCF
              </div>
            </div>
          </div>
          <button className="btn" style={{ padding: '0.25rem' }} onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            background: 'var(--success-bg, #ecfdf5)', color: 'var(--success, #16a34a)',
            padding: '0.5rem 1.5rem', fontSize: '0.8125rem', flexShrink: 0,
            borderBottom: '1px solid var(--border)',
          }}>
            {toast}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'var(--danger-bg, #fef2f2)', color: 'var(--danger, #dc2626)',
            padding: '0.625rem 1.5rem', fontSize: '0.8125rem', flexShrink: 0,
            borderBottom: '1px solid var(--border)',
          }}>
            {error}
          </div>
        )}

        {/* DGII Error Detail Panel */}
        {expandedCase?.error_msg && (
          <div style={{
            background: '#fef2f2',
            borderBottom: '1px solid #fecaca',
            padding: '0.75rem 1.5rem',
            flexShrink: 0,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '0.5rem',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>
                Respuesta DGII — {expandedCase.encf}
              </span>
              <button
                className="btn"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                onClick={() => setExpandedErrorId(null)}
              >
                <Icon name="x" size={12} /> Cerrar
              </button>
            </div>
            <pre style={{
              margin: 0,
              fontSize: '0.7rem',
              color: '#7f1d1d',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.55,
              maxHeight: 200,
              overflowY: 'auto',
              fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
            }}>
              {expandedCase.error_msg}
            </pre>
          </div>
        )}

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '1.25rem 1.5rem' }}>

          {/* ── UPLOAD STEP ── */}
          {step === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              <div style={{
                background: 'var(--surface-alt, var(--surface))',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                lineHeight: 1.6,
              }}>
                <strong style={{ color: 'var(--text)' }}>Orden de envío requerido por la DGII</strong>
                <ol style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                  <li><strong>Primero:</strong> Tipos 31, 32 ≥ RD$250K, 41, 43, 44, 45, 46, 47</li>
                  <li><strong>Segundo:</strong> Tipos 33 (Nota Débito) y 34 (Nota Crédito)</li>
                  <li><strong>Tercero:</strong> Tipo 32 &lt; RD$250K — envía el Resumen (RFCE) primero</li>
                  <li><strong>Cuarto:</strong> Tipo 32 &lt; RD$250K — después de que el RFCE sea aceptado, sube la factura completa desde el portal DGII</li>
                </ol>
                <p style={{ margin: '0.75rem 0 0' }}>
                  Sube el Excel del set de pruebas. Las e-NCFs pre-asignadas por la DGII se usan tal cual — sin consumir tus secuencias. Si algún comprobante falla, la DGII reinicia todo el set.
                </p>
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '0.5rem' }}>
                  Archivo Excel del set de pruebas (.xlsx)
                </label>
                <div
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: file ? 'var(--surface-alt, var(--surface))' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => fileRef.current?.click()}
                >
                  <Icon name="upload" size={28} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                  {file ? (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text)', fontWeight: 600 }}>
                      {file.name}
                      <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      Haz clic para seleccionar el archivo<br />
                      <span style={{ fontSize: '0.75rem' }}>Formato: XLSX generado por la DGII (ambas hojas)</span>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx"
                    style={{ display: 'none' }}
                    onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(''); }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button className="btn" onClick={handleViewCases} disabled={loading}>
                  Ver casos existentes
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleUpload}
                  disabled={!file || loading}
                  style={{ minWidth: 140 }}
                >
                  {loading ? 'Importando…' : 'Importar set de pruebas'}
                </button>
              </div>
            </div>
          )}

          {/* ── CASES STEP ── */}
          {step === 'cases' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Summary bar */}
              {cases.length > 0 && (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {Object.entries(counts).map(([estado, n]) => (
                    <span
                      key={estado}
                      className={`badge ${ESTADO_LABEL[estado as CertCase['estado']]?.cls ?? 'draft'}`}
                    >
                      {ESTADO_LABEL[estado as CertCase['estado']]?.label ?? estado}: {n}
                    </span>
                  ))}
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {cases.length} casos totales
                  </span>
                </div>
              )}

              {/* Action bar */}
              <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                <button
                  className="btn"
                  onClick={() => { setStep('upload'); setError(''); }}
                  style={{ fontSize: '0.8125rem' }}
                >
                  <Icon name="upload" size={14} style={{ marginRight: '0.35rem' }} />
                  Nuevo set
                </button>
                <button
                  className="btn"
                  onClick={handleReset}
                  disabled={loading || runningAll}
                  style={{ fontSize: '0.8125rem' }}
                >
                  <Icon name="refresh" size={14} style={{ marginRight: '0.35rem' }} />
                  Reiniciar todos
                </button>
                {sentCount > 0 && (
                  <button
                    className="btn"
                    onClick={handleCheckAll}
                    disabled={!!checkingId || runningAll}
                    style={{ fontSize: '0.8125rem' }}
                    title="Verifica manualmente los casos que quedaron en 'Enviado'"
                  >
                    <Icon name="refresh" size={14} style={{ marginRight: '0.35rem' }} />
                    {checkingId ? 'Verificando…' : `Verificar enviados (${sentCount})`}
                  </button>
                )}
                {cases.some((c) => c.estado === 'accepted' || c.estado === 'sent') && (
                  <button
                    className="btn"
                    onClick={handleDownloadAll}
                    disabled={runningAll || loading}
                    style={{ fontSize: '0.8125rem' }}
                    title="Descarga los XML firmados para subirlos manualmente al portal DGII"
                  >
                    <Icon name="download" size={14} style={{ marginRight: '0.35rem' }} />
                    Descargar XML
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={handleSendAll}
                  disabled={runningAll || loading || cases.every((c) => c.estado !== 'pending')}
                  style={{ fontSize: '0.8125rem', marginLeft: 'auto' }}
                >
                  {runningAll
                    ? `Enviando ${runningId ? cases.find((c) => c.id === runningId)?.encf : '…'}…`
                    : 'Enviar todos pendientes'}
                </button>
              </div>

              {cases.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '3rem 1rem',
                  color: 'var(--text-muted)', fontSize: '0.875rem',
                }}>
                  No hay casos de prueba importados todavía.<br />
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: '1rem', fontSize: '0.8125rem' }}
                    onClick={() => setStep('upload')}
                  >
                    Importar set de pruebas
                  </button>
                </div>
              ) : (
                <table className="tbl" style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      <th>E-NCF</th>
                      <th>Tipo</th>
                      <th>Canal</th>
                      <th>Estado / Respuesta DGII</th>
                      <th>TrackId</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedCases.map(({ group, cases: groupCases }) => (
                      <>
                        {/* Group header row */}
                        <tr key={`grp-${group}`}>
                          <td
                            colSpan={6}
                            style={{
                              background: 'var(--surface-alt, #f8f9fa)',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              color: 'var(--text-muted)',
                              padding: '0.4rem 0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              borderTop: group > 1 ? '2px solid var(--border)' : undefined,
                            }}
                          >
                            {GROUP_LABELS[group]}
                          </td>
                        </tr>

                        {groupCases.map((c) => {
                          const canal = c.is_rfce ? 'RFCE' : 'Normal';
                          const statusInfo = ESTADO_LABEL[c.estado] ?? { label: c.estado, cls: 'draft' };
                          const isBusy = runningId === c.id;
                          const isChecking = checkingId === c.id;
                          const hasError = !!c.error_msg;
                          const isExpanded = expandedErrorId === c.id;

                          return (
                            <tr key={c.id} style={{ opacity: isBusy || isChecking ? 0.7 : 1 }}>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }}>
                                {c.encf}
                              </td>
                              <td>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                  {c.tipo_ecf}
                                </span>
                                {' '}
                                <span style={{ color: 'var(--text)' }}>
                                  {ECF_LABELS[c.tipo_ecf] ?? `Tipo ${c.tipo_ecf}`}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.75rem', color: c.is_rfce ? 'var(--brand)' : 'var(--text-muted)' }}>
                                {canal}
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                                  {isChecking ? (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                      Verificando…
                                    </span>
                                  ) : (
                                    <span className={`badge ${statusInfo.cls}`}>
                                      {statusInfo.label}
                                    </span>
                                  )}
                                  {hasError && !isChecking && (
                                    <button
                                      title="Ver respuesta DGII completa"
                                      onClick={() => setExpandedErrorId(isExpanded ? null : c.id)}
                                      style={{
                                        background: 'none', border: 'none', padding: '0 0.25rem',
                                        cursor: 'pointer', color: '#dc2626', fontSize: '0.7rem',
                                        textDecoration: 'underline', lineHeight: 1.3,
                                        display: 'flex', alignItems: 'center', gap: '0.2rem',
                                      }}
                                    >
                                      {isExpanded ? 'Ocultar' : 'Ver respuesta DGII'}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {c.track_id ? c.track_id.substring(0, 8) + '…' : '—'}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {(c.estado === 'pending' || c.estado === 'error') && (
                                  <button
                                    className="btn"
                                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                                    onClick={() => handleSendCase(c.id)}
                                    disabled={isBusy || runningAll}
                                  >
                                    {isBusy ? '…' : 'Enviar'}
                                  </button>
                                )}
                                {c.estado === 'sent' && !isChecking && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                      {c.sent_at
                                        ? new Date(c.sent_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
                                        : '—'}
                                    </span>
                                  </div>
                                )}
                                {c.estado === 'accepted' && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--success, #16a34a)' }}>✓</span>
                                    <button
                                      title="Descargar XML firmado"
                                      onClick={() => downloadXml(c.id, c.encf, c.tipo_ecf, c.is_rfce)}
                                      style={{
                                        background: 'none', border: 'none', padding: '0 0.2rem',
                                        cursor: 'pointer', color: 'var(--text-muted)',
                                        lineHeight: 1,
                                      }}
                                    >
                                      <Icon name="download" size={13} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
