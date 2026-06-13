import { NextResponse } from 'next/server';

const ECF_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://ecf.villarja.com';

export const dynamic = 'force-dynamic';

// Actual routes in villarja-ecf-api receptor.ts:
//   GET  /fe/autenticacion/api/semilla               → returns <SemillaModel> XML
//   POST /fe/autenticacion/api/validacioncertificado → requires signed XML body
//   POST /fe/recepcion/api/ecf                       → requires signed e-CF XML body
//   POST /fe/aprobacioncomercial/api/ecf             → requires signed ACECF XML body
const CHECKS = [
  {
    key: 'semilla',
    label: 'Autenticación — Semilla',
    url: `${ECF_BASE}/fe/autenticacion/api/semilla`,
    method: 'GET' as const,
    xmlTag: 'SemillaModel',
  },
  {
    key: 'validacion',
    label: 'Autenticación — ValidacionCertificado',
    url: `${ECF_BASE}/fe/autenticacion/api/validacioncertificado`,
    method: 'POST' as const,
    xmlTag: null,
  },
  {
    key: 'recepcion',
    label: 'Recepción de e-CF',
    url: `${ECF_BASE}/fe/recepcion/api/ecf`,
    method: 'POST' as const,
    xmlTag: null,
  },
  {
    key: 'aprobacion',
    label: 'Aprobación Comercial',
    url: `${ECF_BASE}/fe/aprobacioncomercial/api/ecf`,
    method: 'POST' as const,
    xmlTag: null,
  },
] as const;

export interface UrlCheckResult {
  key: string;
  label: string;
  url: string;
  ok: boolean;
  status: number;
  message: string;
}

export async function POST() {
  const results = await Promise.all(
    CHECKS.map(async ({ key, label, url, method, xmlTag }): Promise<UrlCheckResult> => {
      try {
        const res = await fetch(url, {
          method,
          signal: AbortSignal.timeout(8000),
          headers: { Accept: 'application/xml, text/xml, */*' },
        });

        let ok = false;
        let message = `HTTP ${res.status}`;

        if (xmlTag && res.ok) {
          // GET endpoint — verify expected XML tag is present
          const text = await res.text();
          if (text.includes(`<${xmlTag}`)) {
            ok = true;
            message = `Semilla recibida correctamente (<${xmlTag}>)`;
          } else {
            ok = false;
            message = `Respuesta inesperada (sin etiqueta <${xmlTag}>)`;
          }
        } else if (res.status === 400) {
          // POST endpoint without body → 400 = service is up, just needs payload
          ok = true;
          message = 'Servicio activo (HTTP 400 — requiere cuerpo XML firmado)';
        } else if (res.status === 401) {
          ok = true;
          message = 'Servicio activo (HTTP 401 — requiere autenticación)';
        } else if (res.status < 500) {
          ok = true;
          message = `Servicio activo (HTTP ${res.status})`;
        } else {
          ok = false;
          message = `Error del servidor (HTTP ${res.status})`;
        }

        return { key, label, url, ok, status: res.status, message };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        const isTimeout = msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('abort');
        return {
          key,
          label,
          url,
          ok: false,
          status: 0,
          message: isTimeout
            ? 'Sin respuesta en 8s — servicio inaccesible'
            : `Error de conexión: ${msg}`,
        };
      }
    }),
  );

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ results, allOk });
}
