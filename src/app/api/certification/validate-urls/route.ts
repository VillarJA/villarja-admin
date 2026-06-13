import { NextResponse } from 'next/server';

const ECF_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://ecf.villarja.com';

export const dynamic = 'force-dynamic';

const CHECKS = [
  {
    key: 'semilla',
    label: 'Autenticación — Semilla',
    url: `${ECF_BASE}/fe/autenticacion/api/semilla`,
    expectXml: true,
  },
  {
    key: 'token',
    label: 'Autenticación — Token / ValidacionCertificado',
    url: `${ECF_BASE}/fe/autenticacion/api/token`,
    expectXml: false,
  },
  {
    key: 'recepcion',
    label: 'Recepción de e-CF',
    url: `${ECF_BASE}/fe/recepcion/api/ecf`,
    expectXml: false,
  },
  {
    key: 'aprobacion',
    label: 'Aprobación Comercial',
    url: `${ECF_BASE}/fe/aprobacioncomercial/api/ecf`,
    expectXml: false,
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
    CHECKS.map(async ({ key, label, url, expectXml }): Promise<UrlCheckResult> => {
      try {
        const res = await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(8000),
          headers: { Accept: 'application/xml, text/xml, */*' },
        });

        // Any non-5xx response means the service is reachable
        let ok = res.status < 500;
        let message = `HTTP ${res.status}`;

        if (expectXml && res.ok) {
          const text = await res.text();
          if (text.includes('<Semilla>')) {
            message = 'Semilla recibida — servicio activo';
          } else {
            ok = false;
            message = 'Respuesta inesperada (sin etiqueta Semilla)';
          }
        } else if (res.ok) {
          message = `Servicio activo (HTTP ${res.status})`;
        } else if (res.status === 405) {
          // POST-only endpoint returns 405 for GET — still reachable
          message = 'Servicio activo (endpoint POST, HTTP 405 esperado)';
          ok = true;
        } else if (res.status === 400) {
          message = 'Servicio activo (HTTP 400 — requiere payload)';
          ok = true;
        } else if (res.status === 404) {
          message = 'Ruta no encontrada (HTTP 404)';
          ok = false;
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
