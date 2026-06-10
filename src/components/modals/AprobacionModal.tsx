'use client';

import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/Icons';
import type { Company } from '@/types';
import * as XLSX from 'xlsx';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AprobacionCase {
  id: number;
  rncEmisor: string;
  eNCF: string;
  fechaEmision: string;
  montoTotal: number;
  rncComprador: string;
  estado: 1 | 0;
  detalleMotivoRechazo: string;
  result: 'pending' | 'ok' | 'error';
  errorMsg?: string;
}

type ViewStep = 'upload' | 'cases';

interface Props {
  company: Company;
  onClose: () => void;
  onAllSent?: () => void;
}

// ─── Excel parser ──────────────────────────────────────────────────────────────

function normalizeKey(k: string): string {
  return k
    .toLowerCase()
    .replace(/[éáíóúüñ]/g, (c) => ({ é: 'e', á: 'a', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' }[c] ?? c))
    .replace(/[\s_\-.]/g, '');
}

function pick(row: Record<string, unknown>, ...aliases: string[]): string {
  for (const alias of aliases) {
    const target = normalizeKey(alias);
    const key = Object.keys(row).find((k) => normalizeKey(k) === target);
    if (key !== undefined && row[key] !== undefined && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  return '';
}

function parseAprobacionExcel(file: File, fallbackRncComprador: string): Promise<AprobacionCase[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false });
        const cases: AprobacionCase[] = rows
          .filter((row) => Object.values(row).some((v) => String(v).trim() !== ''))
          .map((row, i) => {
            const estadoRaw = pick(
              row,
              'estado', 'resultado', 'aprobacion', 'respuesta', 'tipo respuesta',
            ).toLowerCase();
            const estado: 1 | 0 =
              estadoRaw === '0' || estadoRaw === 'rechazado' || estadoRaw === 'rechazo' ? 0 : 1;
            const rncComprador =
              pick(row, 'rnc comprador', 'rnccomprador', 'comprador', 'rnc receptor', 'rnc_comprador') ||
              fallbackRncComprador;
            return {
              id: i,
              rncEmisor: pick(row, 'rnc emisor', 'rncemisor', 'emisor', 'rnc_emisor', 'rnc emisor prueba'),
              eNCF: pick(row, 'encf', 'e-ncf', 'ncf', 'numero comprobante', 'e ncf', 'encf prueba'),
              fechaEmision: pick(row, 'fecha emision', 'fechaemision', 'fecha', 'fecha_emision', 'fecha emision'),
              montoTotal: parseFloat(pick(row, 'monto total', 'montototal', 'monto', 'total', 'monto_total') || '0') || 0,
              rncComprador,
              estado,
              detalleMotivoRechazo: pick(row, 'motivo', 'detalle', 'motivo rechazo', 'detallemotivorechazo', 'detalle motivo'),
              result: 'pending',
            };
          });
        resolve(cases);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AprobacionModal({ company, onClose, onAllSent }: Props) {
  const [viewStep, setViewStep] = useState<ViewStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [cases, setCases] = useState<AprobacionCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const apiKey = company.apiKey ?? '';
  const PASO3_KEY = `villarja_paso3_${company.rnc}`;

  // Load cached cases from localStorage on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(PASO3_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as AprobacionCase[];
        if (parsed.length > 0) {
          setCases(parsed);
          setViewStep('cases');
        }
      }
    } catch {
      // ignore — localStorage may be unavailable
    }
  }, [PASO3_KEY]);

  // Persist cases to localStorage whenever they change
  useEffect(() => {
    if (cases.length > 0) {
      try {
        localStorage.setItem(PASO3_KEY, JSON.stringify(cases));
      } catch {
        // ignore
      }
    }
  }, [cases, PASO3_KEY]);

  // Notify parent when all cases are sent successfully
  useEffect(() => {
    if (cases.length > 0 && cases.every((c) => c.result === 'ok')) {
      onAllSent?.();
    }
  }, [cases, onAllSent]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  // ── Upload Excel ──
  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const parsed = await parseAprobacionExcel(file, company.rnc);
      if (parsed.length === 0) {
        setError('El archivo no contiene filas de datos.');
        return;
      }
      setCases(parsed);
      setViewStep('cases');
      showToast(`${parsed.length} caso${parsed.length !== 1 ? 's' : ''} cargado${parsed.length !== 1 ? 's' : ''}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al parsear el Excel');
    } finally {
      setLoading(false);
    }
  }

  // ── Toggle estado per row ──
  function toggleEstado(id: number) {
    setCases((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, estado: (c.estado === 1 ? 0 : 1) as 1 | 0, detalleMotivoRechazo: '' } : c,
      ),
    );
  }

  function setMotivo(id: number, motivo: string) {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, detalleMotivoRechazo: motivo } : c)));
  }

  // ── Send one case ──
  async function sendCase(c: AprobacionCase): Promise<boolean> {
    setRunningId(c.id);
    setError('');
    try {
      const res = await fetch('/api/certification/aprobacion', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rncEmisor: c.rncEmisor,
          eNCF: c.eNCF,
          fechaEmision: c.fechaEmision,
          montoTotal: c.montoTotal,
          rncComprador: c.rncComprador,
          estado: c.estado,
          detalleMotivoRechazo: c.detalleMotivoRechazo || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (json as { error?: string }).error ?? `HTTP ${res.status}`;
        setCases((prev) => prev.map((x) => (x.id === c.id ? { ...x, result: 'error', errorMsg: msg } : x)));
        setError(`Error en ${c.eNCF || `caso ${c.id + 1}`}: ${msg}`);
        return false;
      }
      setCases((prev) => prev.map((x) => (x.id === c.id ? { ...x, result: 'ok', errorMsg: undefined } : x)));
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de red';
      setCases((prev) => prev.map((x) => (x.id === c.id ? { ...x, result: 'error', errorMsg: msg } : x)));
      setError(`Error en ${c.eNCF || `caso ${c.id + 1}`}: ${msg}`);
      return false;
    } finally {
      setRunningId(null);
    }
  }

  async function handleSendOne(c: AprobacionCase) {
    await sendCase(c);
  }

  async function handleSendAll() {
    setRunningAll(true);
    setError('');
    const pending = cases.filter((c) => c.result === 'pending' || c.result === 'error');
    for (const c of pending) {
      const ok = await sendCase(c);
      if (!ok) { setRunningAll(false); return; }
    }
    setRunningAll(false);
    showToast('Todos los casos enviados correctamente');
  }

  function handleReset() {
    setCases((prev) => prev.map((c) => ({ ...c, result: 'pending' as const, errorMsg: undefined })));
    setError('');
    showToast('Casos reiniciados');
  }

  const pendingCount = cases.filter((c) => c.result === 'pending').length;
  const okCount = cases.filter((c) => c.result === 'ok').length;
  const errCount = cases.filter((c) => c.result === 'error').length;

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
        role="dialog"
        aria-modal="true"
        aria-labelledby="aprobacion-title"
        className="card"
        style={{
          width: '100%', maxWidth: 860, maxHeight: '92vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Icon name="checkcircle" size={20} style={{ color: 'var(--brand)' }} />
            <div>
              <div id="aprobacion-title" style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                Pruebas de Aprobación Comercial
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {company.razon} — Paso 3 de certificación certeCF
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

          {/* ── UPLOAD ── */}
          {viewStep === 'upload' && (
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
                  <li>Descarga el Excel de pruebas de aprobaciones desde el portal DGII certecf.</li>
                  <li>Súbelo aquí — el sistema detecta los campos automáticamente.</li>
                  <li>Revisa y ajusta la respuesta (Aprobar / Rechazar) por cada caso si es necesario.</li>
                  <li>Envía todos al ambiente certecf. El sistema construye y firma cada XML con el certificado del emisor.</li>
                </ol>
              </div>

              <div>
                <label style={{
                  fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)',
                  display: 'block', marginBottom: '0.5rem',
                }}>
                  Archivo Excel de aprobaciones (.xlsx)
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

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleUpload}
                  disabled={!file || loading}
                  style={{ minWidth: 140 }}
                >
                  {loading ? 'Cargando…' : 'Cargar aprobaciones'}
                </button>
              </div>
            </div>
          )}

          {/* ── CASES TABLE ── */}
          {viewStep === 'cases' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* All-done banner */}
              {cases.length > 0 && cases.every((c) => c.result === 'ok') && (
                <div style={{
                  background: 'var(--success-bg, #f0fdf4)',
                  border: '1px solid var(--success-bd, #bbf7d0)',
                  borderRadius: 8,
                  padding: '0.875rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  fontSize: '0.8375rem',
                  color: 'var(--success, #15803d)',
                }}>
                  <Icon name="checkcircle" size={18} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>
                    <strong>Todos los casos enviados.</strong> El Paso 3 se marcará como completado automáticamente.
                  </span>
                  <button className="btn" style={{ fontSize: '0.8125rem', flexShrink: 0 }} onClick={onClose}>
                    Cerrar
                  </button>
                </div>
              )}

              {/* Summary + action bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                {okCount > 0 && <span className="badge ok" style={{ fontSize: '0.7rem' }}>Enviados: {okCount}</span>}
                {pendingCount > 0 && <span className="badge draft" style={{ fontSize: '0.7rem' }}>Pendientes: {pendingCount}</span>}
                {errCount > 0 && <span className="badge err" style={{ fontSize: '0.7rem' }}>Errores: {errCount}</span>}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn"
                    onClick={() => {
                      setCases([]);
                      try { localStorage.removeItem(PASO3_KEY); } catch { /* ignore */ }
                      setViewStep('upload');
                      setFile(null);
                      setError('');
                    }}
                    style={{ fontSize: '0.8125rem' }}
                  >
                    <Icon name="upload" size={14} style={{ marginRight: '0.35rem' }} />
                    Nuevo Excel
                  </button>
                  <button
                    className="btn"
                    onClick={handleReset}
                    disabled={runningAll || loading}
                    style={{ fontSize: '0.8125rem' }}
                  >
                    <Icon name="refresh" size={14} style={{ marginRight: '0.35rem' }} />
                    Reiniciar
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSendAll}
                    disabled={runningAll || loading || (pendingCount + errCount === 0)}
                    style={{ fontSize: '0.8125rem' }}
                  >
                    {runningAll ? 'Enviando…' : 'Enviar todos pendientes'}
                  </button>
                </div>
              </div>

              {/* Cases table */}
              {cases.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '3rem 1rem',
                  color: 'var(--text-muted)', fontSize: '0.875rem',
                }}>
                  No hay casos cargados.
                </div>
              ) : (
                <table className="tbl" style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      <th>e-NCF</th>
                      <th>RNC Emisor</th>
                      <th>Fecha</th>
                      <th style={{ textAlign: 'right' }}>Monto</th>
                      <th>Respuesta</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((c) => {
                      const busy = runningId === c.id;
                      const editable = c.result === 'pending' || c.result === 'error';
                      return (
                        <tr key={c.id} style={{ opacity: busy ? 0.6 : 1 }}>
                          <td style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}>
                            {c.eNCF || '—'}
                          </td>
                          <td style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-mono, monospace)',
                          }}>
                            {c.rncEmisor || '—'}
                          </td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {c.fechaEmision || '—'}
                          </td>
                          <td style={{
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '0.75rem',
                          }}>
                            {c.montoTotal > 0 ? `$${c.montoTotal.toLocaleString('es-DO')}` : '—'}
                          </td>
                          <td>
                            {editable ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <button
                                  onClick={() => toggleEstado(c.id)}
                                  disabled={busy || runningAll}
                                  title="Clic para cambiar entre Aprobar y Rechazar"
                                  style={{
                                    background: c.estado === 1 ? 'var(--ok-bg, #dcfce7)' : 'var(--err-bg, #fef2f2)',
                                    color: c.estado === 1 ? 'var(--ok, #16a34a)' : 'var(--err, #dc2626)',
                                    border: `1px solid ${c.estado === 1 ? 'var(--ok-bd, #bbf7d0)' : 'var(--err-bd, #fecaca)'}`,
                                    borderRadius: 4,
                                    padding: '0.2rem 0.6rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {c.estado === 1 ? '✓ Aprobar' : '✗ Rechazar'}
                                </button>
                                {c.estado === 0 && (
                                  <input
                                    type="text"
                                    placeholder="Motivo del rechazo…"
                                    value={c.detalleMotivoRechazo}
                                    onChange={(e) => setMotivo(c.id, e.target.value)}
                                    style={{
                                      fontSize: '0.7rem',
                                      padding: '0.15rem 0.4rem',
                                      border: '1px solid var(--border)',
                                      borderRadius: 4,
                                      background: 'var(--surface)',
                                      color: 'var(--text)',
                                      width: '100%',
                                    }}
                                  />
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {c.estado === 1 ? 'Aprobado' : 'Rechazado'}
                              </span>
                            )}
                          </td>
                          <td>
                            {c.result === 'ok' && (
                              <span className="badge ok" style={{ fontSize: '0.7rem' }}>Aceptado</span>
                            )}
                            {c.result === 'error' && (
                              <span
                                className="badge err"
                                style={{ fontSize: '0.7rem', cursor: 'help' }}
                                title={c.errorMsg}
                              >
                                Error
                              </span>
                            )}
                            {c.result === 'pending' && (
                              <span className="badge draft" style={{ fontSize: '0.7rem' }}>Pendiente</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {editable && (
                              <button
                                className="btn"
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                                onClick={() => handleSendOne(c)}
                                disabled={busy || runningAll}
                              >
                                {busy ? '…' : 'Enviar'}
                              </button>
                            )}
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
