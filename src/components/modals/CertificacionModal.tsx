'use client';

/**
 * CertificacionModal
 *
 * Allows an admin to:
 * 1. Upload the DGII-provided Excel test set (.xlsx).
 *    The Excel is parsed client-side with the `xlsx` library.
 *    Parsed rows are sent to the ECF API (POST /certification/cases) which
 *    stores them verbatim — no portal sequences are consumed.
 * 2. See all 25+ test cases with their current status.
 * 3. Send each case individually (or run all pending ones sequentially).
 * 4. See DGII responses per case (trackId, error).
 * 5. Reset all cases back to pending (manual or automatic on error).
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
        // Sheet 1 = main ECF cases; Sheet 2 = RFCE-only subset
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: '#e',
          raw: false,
        });
        resolve(rows);
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
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
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
        // On error, the API resets all sibling cases automatically — refresh
        setError(json.error ?? 'Error al enviar el caso');
        await fetchCases();
      } else {
        showToast(json.message ?? `Enviado: ${json.data?.encf ?? ''}`);
        await fetchCases();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red');
    } finally {
      setRunningId(null);
    }
  }

  // ── Send all pending sequentially ──
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
    }
    setRunningId(null);
    setRunningAll(false);
    showToast('Todos los casos enviados');
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

  // ── Summary counts ──
  const counts = cases.reduce(
    (acc, c) => {
      acc[c.estado] = (acc[c.estado] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

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
          width: '100%', maxWidth: 780, maxHeight: '92vh',
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
                <strong style={{ color: 'var(--text)' }}>¿Cómo funciona?</strong>
                <ol style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                  <li>Descarga el Excel del set de pruebas desde el portal de la DGII.</li>
                  <li>Súbelo aquí. Las e-NCFs pre-asignadas por la DGII se usan tal cual — sin consumir tus secuencias.</li>
                  <li>Envía cada comprobante al ambiente <strong>certecf</strong> de la DGII.</li>
                  <li>Si alguno falla, la DGII reinicia todas las pruebas automáticamente.</li>
                </ol>
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
                      <span style={{ fontSize: '0.75rem' }}>Formato: XLSX generado por la DGII</span>
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
                      <th>e-NCF</th>
                      <th>Tipo</th>
                      <th>Canal</th>
                      <th>Estado</th>
                      <th>TrackId</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((c) => {
                      const montoTotal = 0; // estado visual only
                      const isRFCE = c.tipo_ecf === 32;
                      const statusInfo = ESTADO_LABEL[c.estado] ?? { label: c.estado, cls: 'draft' };
                      const isBusy = runningId === c.id;
                      return (
                        <tr key={c.id} style={{ opacity: isBusy ? 0.7 : 1 }}>
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
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {isRFCE ? 'RFCE' : 'Normal'}
                          </td>
                          <td>
                            <span className={`badge ${statusInfo.cls}`}>
                              {statusInfo.label}
                            </span>
                            {c.error_msg && (
                              <div
                                title={c.error_msg}
                                style={{
                                  fontSize: '0.7rem', color: 'var(--danger, #dc2626)',
                                  maxWidth: 180, overflow: 'hidden',
                                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  marginTop: '0.125rem',
                                }}
                              >
                                {c.error_msg}
                              </div>
                            )}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {c.track_id
                              ? c.track_id.substring(0, 8) + '…'
                              : '—'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {c.estado === 'pending' || c.estado === 'error' ? (
                              <button
                                className="btn"
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                                onClick={() => handleSendCase(c.id)}
                                disabled={isBusy || runningAll}
                              >
                                {isBusy ? '…' : 'Enviar'}
                              </button>
                            ) : c.estado === 'sent' ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {c.sent_at ? new Date(c.sent_at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : '—'}
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
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
