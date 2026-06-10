'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/Icons';
import { getFacturasForCliente } from '@/lib/data-layer';
import type { Company, Factura } from '@/types';
import { AprobacionModal } from '@/components/modals/AprobacionModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const ECF_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://ecf.villarja.com';

const SERVICE_URLS = {
  autenticacion: `${ECF_BASE}/fe/autenticacion/api/semilla`,
  token:         `${ECF_BASE}/fe/autenticacion/api/token`,
  recepcion:     `${ECF_BASE}/fe/recepcion/api/ecf`,
  aprobacion:    `${ECF_BASE}/fe/aprobacioncomercial/api/ecf`,
};

// All e-CF types with labels (used in steps 4, 5, 6)
const ECF_TYPES_RI = [
  { tipo: 31, label: 'Comprobante de Crédito Fiscal' },
  { tipo: 32, label: 'Factura de Consumo Electrónica (FCE / RFCE)' },
  { tipo: 33, label: 'Nota de Débito' },
  { tipo: 34, label: 'Nota de Crédito' },
  { tipo: 41, label: 'Compras' },
  { tipo: 43, label: 'Gastos Menores' },
  { tipo: 44, label: 'Regímenes Especiales' },
  { tipo: 45, label: 'Gubernamental' },
  { tipo: 46, label: 'Exportaciones' },
  { tipo: 47, label: 'Pagos al Exterior' },
];

// ─── Step configuration ───────────────────────────────────────────────────────

type StepTipo = 'manual' | 'automatic' | 'hybrid';

interface StepConfig {
  paso: number;
  titulo: string;
  descripcion: string;
  tipo: StepTipo;
}

const CERT_STEPS: StepConfig[] = [
  { paso: 1,  titulo: 'Solicitud de certificación',         descripcion: 'Completar el formulario FI-GDF-016 en el portal DGII',                         tipo: 'manual'    },
  { paso: 2,  titulo: 'Set de pruebas DGII',                descripcion: 'Enviar los 25 comprobantes pre-asignados al ambiente certecf',                  tipo: 'automatic' },
  { paso: 3,  titulo: 'Pruebas de aprobación comercial',    descripcion: 'Descargar el set Excel de aprobaciones certecf y enviar XMLs de aprobación/rechazo', tipo: 'hybrid' },
  { paso: 4,  titulo: 'Pruebas de simulación',              descripcion: 'Emitir comprobantes con datos reales del emisor en certecf',                    tipo: 'hybrid'    },
  { paso: 5,  titulo: 'Representaciones impresas al portal DGII', descripcion: 'Descargar los PDFs de los e-CF simulados y cargarlos al portal de certificación', tipo: 'hybrid'    },
  { paso: 6,  titulo: 'Validación de representaciones por DGII', descripcion: 'Esperar aprobación o corregir y reenviar representaciones impresas rechazadas', tipo: 'hybrid'    },
  { paso: 7,  titulo: 'URL servicio de prueba',             descripcion: 'Registrar las 4 URLs de servicio del ambiente certecf en el portal DGII',      tipo: 'hybrid'    },
  { paso: 8,  titulo: 'Inicio prueba recepción e-CF',       descripcion: 'Descargar certificado raíz DGII, validar firma si aplica e indicar que el receptor está listo', tipo: 'hybrid'    },
  { paso: 9,  titulo: 'Recepción de e-CF',                  descripcion: 'Confirmar que el receptor procesa e-CF enviados por la DGII y responde ARECF', tipo: 'hybrid'    },
  { paso: 10, titulo: 'Inicio prueba aprobaciones comerciales', descripcion: 'Indicar a la DGII que el receptor está listo para recibir ACECF de prueba', tipo: 'hybrid'    },
  { paso: 11, titulo: 'Recepción de aprobaciones comerciales', descripcion: 'Confirmar que el endpoint procesa ACECF inbound enviados por la DGII',         tipo: 'hybrid'    },
  { paso: 12, titulo: 'URLs de servicio — producción',      descripcion: 'Registrar las 4 URLs de producción en el portal DGII',                         tipo: 'hybrid'    },
  { paso: 13, titulo: 'Declaración Jurada',                 descripcion: 'Firmar y enviar la Declaración Jurada al portal DGII',                         tipo: 'manual'    },
  { paso: 14, titulo: 'Verificación tributaria',            descripcion: 'Confirmar que el contribuyente está al día con la DGII',                       tipo: 'manual'    },
  { paso: 15, titulo: 'Activación en producción',           descripcion: 'La DGII activa el ambiente de producción del emisor',                          tipo: 'manual'    },
];

const TIPO_LABEL: Record<StepTipo, string> = {
  manual:    'Manual',
  automatic: 'Automático',
  hybrid:    'Mixto',
};

const TIPO_BADGE: Record<StepTipo, string> = {
  manual:    'draft',
  automatic: 'ok',
  hybrid:    'info',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgressData {
  status: 'no_iniciada' | 'en_proceso' | 'certificada';
  completedSteps: number[];
  notes: string | null;
}

interface TestFirmaResult {
  ok: boolean;
  message: string;
}

interface Props {
  company: Company;
  onOpenTestSet: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isCompleted(paso: number, completed: number[]): boolean {
  return completed.includes(paso);
}

function isBlocked(paso: number, completed: number[]): boolean {
  if (paso <= 1) return false;
  return !completed.includes(paso - 1);
}

function stepBorderColor(paso: number, completed: number[], selected: number): string {
  if (isCompleted(paso, completed)) return 'var(--success, #16a34a)';
  if (paso === selected) return 'var(--brand)';
  if (isBlocked(paso, completed)) return '#e5e7eb';
  return '#d1d5db';
}

function stepTextColor(paso: number, completed: number[], selected: number): string {
  if (isCompleted(paso, completed)) return 'var(--success, #16a34a)';
  if (isBlocked(paso, completed)) return 'var(--text-muted)';
  if (paso === selected) return 'var(--brand)';
  return 'var(--text)';
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function URLCard({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent — clipboard may be unavailable in some contexts
    }
  };

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '0.75rem 1rem',
      marginBottom: '0.625rem',
    }}>
      <div style={{
        fontSize: '0.7rem',
        fontWeight: 700,
        color: 'var(--text-muted)',
        marginBottom: '0.375rem',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <code style={{
          flex: 1,
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
          color: 'var(--text)',
          background: 'var(--surface-alt, #f9f9f8)',
          padding: '0.375rem 0.625rem',
          borderRadius: 4,
          border: '1px solid var(--border)',
          wordBreak: 'break-all',
          lineHeight: 1.5,
        }}>
          {url}
        </code>
        <button
          className="btn"
          style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', flexShrink: 0 }}
          onClick={handleCopy}
        >
          {copied ? (
            <><Icon name="check" size={13} style={{ marginRight: 4 }} />Copiado</>
          ) : (
            <><Icon name="copy" size={13} style={{ marginRight: 4 }} />Copiar</>
          )}
        </button>
      </div>
    </div>
  );
}

function InstructionList({ items }: { items: string[] }) {
  return (
    <ol style={{
      margin: '0.875rem 0',
      paddingLeft: '1.375rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.6 }}>
          {item}
        </li>
      ))}
    </ol>
  );
}

function AlertBox({ type, children }: { type: 'info' | 'success' | 'warning' | 'error'; children: React.ReactNode }) {
  const styles: Record<string, { bg: string; border: string; color: string }> = {
    info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
    warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e' },
    error:   { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
  };
  const s = styles[type];
  return (
    <div style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 8,
      padding: '0.75rem 1rem',
      marginBottom: '1rem',
      fontSize: '0.8125rem',
      color: s.color,
      lineHeight: 1.55,
    }}>
      {children}
    </div>
  );
}

function DGIIPortalLink() {
  return (
    <a
      href="https://ecf.dgii.gov.do/certecf"
      target="_blank"
      rel="noopener noreferrer"
      className="btn"
      style={{
        fontSize: '0.8125rem',
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
      }}
    >
      <Icon name="link" size={14} />
      Abrir Portal DGII certecf
    </a>
  );
}

interface ConfirmButtonProps {
  paso: number;
  completed: number[];
  onMark: (paso: number, action: 'complete' | 'undo') => void;
  loading: boolean;
}

function ConfirmButton({ paso, completed, onMark, loading }: ConfirmButtonProps) {
  const done = isCompleted(paso, completed);
  const blocked = isBlocked(paso, completed);

  return (
    <div style={{
      marginTop: '1.375rem',
      paddingTop: '1rem',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.75rem',
    }}>
      {done ? (
        <>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            color: 'var(--success, #16a34a)',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}>
            <Icon name="checkcircle" size={16} />
            Paso completado
          </span>
          <button
            className="btn"
            style={{ fontSize: '0.75rem' }}
            onClick={() => onMark(paso, 'undo')}
            disabled={loading}
          >
            Desmarcar
          </button>
        </>
      ) : (
        <button
          className="btn btn-primary"
          onClick={() => onMark(paso, 'complete')}
          disabled={loading || blocked}
          style={{ fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          {loading ? 'Guardando…' : <><Icon name="check" size={15} />Marcar como completado</>}
        </button>
      )}
    </div>
  );
}

interface TypeCheckRowProps {
  tipo: number;
  label: string;
  checked: boolean;
  onToggle: () => void;
  required?: boolean;
}

function TypeCheckRow({ tipo, label, checked, onToggle, required }: TypeCheckRowProps) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        padding: '0.4rem 0.625rem',
        borderRadius: 6,
        border: `1px solid ${checked ? 'var(--success-bd, #bbf7d0)' : 'var(--border)'}`,
        background: checked ? 'var(--success-bg, #f0fdf4)' : 'transparent',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'border-color 0.12s ease, background 0.12s ease',
        marginBottom: '0.375rem',
      }}
    >
      <span style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        flexShrink: 0,
        border: `1.5px solid ${checked ? 'var(--success, #16a34a)' : 'var(--border)'}`,
        background: checked ? 'var(--success, #16a34a)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.12s ease',
      }}>
        {checked && <Icon name="check" size={11} style={{ color: '#fff' }} />}
      </span>
      <span style={{
        fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        minWidth: 24,
      }}>
        T{tipo}
      </span>
      <span style={{ fontSize: '0.8125rem', color: 'var(--text)', flex: 1 }}>
        {label}
      </span>
      {required && (
        <span className="badge err" style={{ fontSize: '0.65rem', flexShrink: 0 }}>
          Requerido
        </span>
      )}
    </div>
  );
}

function FacturaEvidenceRow({
  factura,
  onDownloadPdf,
  onDownloadXml,
}: {
  factura: Factura;
  onDownloadPdf: (factura: Factura) => void;
  onDownloadXml: (factura: Factura) => void;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) auto',
      gap: '0.75rem',
      padding: '0.625rem 0.75rem',
      borderTop: '1px solid var(--border)',
      alignItems: 'center',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="tag-type">T{factura.tipo}</span>
          <code style={{ fontSize: '0.75rem', color: 'var(--text)' }}>{factura.encf}</code>
          <span className={`badge ${factura.estado === 'accepted' ? 'ok' : 'info'}`} style={{ fontSize: '0.65rem' }}>
            {factura.estado === 'accepted' ? 'Aceptado DGII' : factura.estado}
          </span>
        </div>
        <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Ambiente {factura.ambiente} · Monto ${factura.total.toFixed(2)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button className="btn" style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }} onClick={() => onDownloadXml(factura)}>
          <Icon name="download" size={13} style={{ marginRight: 4 }} />
          XML
        </button>
        <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }} onClick={() => onDownloadPdf(factura)}>
          <Icon name="file" size={13} style={{ marginRight: 4 }} />
          PDF
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CertificacionTab({ company, onOpenTestSet }: Props) {
  const [selectedPaso, setSelectedPaso] = useState(1);
  const [progress, setProgress] = useState<ProgressData>({
    status: 'no_iniciada',
    completedSteps: [],
    notes: null,
  });
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState('');
  const [showAprobacion, setShowAprobacion] = useState(false);
  const [testFirmaResult, setTestFirmaResult] = useState<TestFirmaResult | null>(null);
  const [testFirmaLoading, setTestFirmaLoading] = useState(false);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [facturasLoading, setFacturasLoading] = useState(true);
  const [checkedRITypes, setCheckedRITypes] = useState<Set<number>>(new Set());
  const checkedRITypesKey = `villarja_ri_types_${company.rnc}`;

  function toggleRIType(tipo: number) {
    setCheckedRITypes((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) { next.delete(tipo); } else { next.add(tipo); }
      return next;
    });
  }

  const apiKey = company.apiKey ?? '';

  // ── Fetch progress from API ──
  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch('/api/certification/progress', {
        headers: { 'x-api-key': apiKey },
      });
      if (res.ok) {
        const json = await res.json();
        const data: ProgressData = json.data ?? json;
        setProgress(data);
        const firstPending = CERT_STEPS.find((s) => !data.completedSteps.includes(s.paso));
        if (firstPending) setSelectedPaso(firstPending.paso);
      }
    } catch {
      // keep defaults — API not available in demo mode
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  useEffect(() => {
    let cancelled = false;

    async function loadFacturas() {
      setFacturasLoading(true);
      try {
        const data = await getFacturasForCliente(company.id);
        if (!cancelled) setFacturas(data);
      } finally {
        if (!cancelled) setFacturasLoading(false);
      }
    }

    loadFacturas();
    return () => { cancelled = true; };
  }, [company.id]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(checkedRITypesKey);
      if (!cached) return;
      const parsed = JSON.parse(cached) as number[];
      setCheckedRITypes(new Set(parsed.filter((value) => Number.isInteger(value))));
    } catch {
      // ignore localStorage parsing failures
    }
  }, [checkedRITypesKey]);

  useEffect(() => {
    try {
      localStorage.setItem(checkedRITypesKey, JSON.stringify(Array.from(checkedRITypes)));
    } catch {
      // ignore localStorage write failures
    }
  }, [checkedRITypes, checkedRITypesKey]);

  // ── Mark / unmark a step ──
  const markStep = async (paso: number, action: 'complete' | 'undo') => {
    setMarking(true);
    setMarkError('');
    try {
      const res = await fetch('/api/certification/progress', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: paso, action }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        const data = (json as { data?: { status: string; completedSteps: number[] } }).data ?? json;
        setProgress((prev) => ({
          ...prev,
          status: (data as { status: ProgressData['status'] }).status,
          completedSteps: (data as { completedSteps: number[] }).completedSteps,
        }));
      } else {
        setMarkError((json as { error?: string }).error ?? `Error ${res.status} al guardar el progreso`);
      }
    } catch (err) {
      setMarkError(err instanceof Error ? err.message : 'Error de red al guardar el progreso');
    } finally {
      setMarking(false);
    }
  };

  // ── Test digital signature ──
  const runTestFirma = async () => {
    setTestFirmaLoading(true);
    setTestFirmaResult(null);
    try {
      const res = await fetch('/api/certification/test-firma', {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
      });
      const json = await res.json();
      if (res.ok) {
        setTestFirmaResult({
          ok: true,
          message: json.message ?? 'Firma digital válida. El certificado firma correctamente.',
        });
      } else {
        setTestFirmaResult({
          ok: false,
          message: json.error ?? 'Error al probar la firma digital.',
        });
      }
    } catch (err) {
      setTestFirmaResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Error de red al contactar el API.',
      });
    } finally {
      setTestFirmaLoading(false);
    }
  };

  // ── Progress bar ──
  const completedCount = progress.completedSteps.length;
  const totalSteps = CERT_STEPS.length;
  const pct = Math.round((completedCount / totalSteps) * 100);
  const facturasCertecfAceptadas = facturas.filter((factura) => (
    factura.encf &&
    factura.estado === 'accepted' &&
    factura.ambiente.toLowerCase() === 'certecf'
  ));
  const riFacturas = facturasCertecfAceptadas.filter((factura) => ECF_TYPES_RI.some((type) => type.tipo === factura.tipo));
  const checkedRITypesSorted = Array.from(checkedRITypes).sort((a, b) => a - b);
  const requiredSimulationTypes = [31, 32];
  const missingSimulationTypes = requiredSimulationTypes.filter((tipo) => !riFacturas.some((factura) => factura.tipo === tipo));
  const checkedRILabels = checkedRITypesSorted
    .map((tipo) => ECF_TYPES_RI.find((candidate) => candidate.tipo === tipo)?.label ?? `Tipo ${tipo}`);

  const downloadEcfFile = async (factura: Factura, type: 'xml' | 'pdf') => {
    try {
      const res = await fetch(`/api/ecf/${factura.id}/${type}`, {
        headers: { 'X-API-Key': apiKey },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${factura.encf || factura.id}.${type}`;
      a.click();
      URL.revokeObjectURL(href);
    } catch (err) {
      setMarkError(err instanceof Error ? `Error al descargar ${type.toUpperCase()}: ${err.message}` : `Error al descargar ${type.toUpperCase()}`);
    }
  };

  const STATUS_DISPLAY: Record<string, { label: string; cls: string }> = {
    no_iniciada: { label: 'Sin iniciar',  cls: 'draft' },
    en_proceso:  { label: 'En proceso',   cls: 'info'  },
    certificada: { label: 'Certificado',  cls: 'ok'    },
  };
  const statusInfo = STATUS_DISPLAY[progress.status] ?? STATUS_DISPLAY.no_iniciada;

  // ─── Step detail content (per step) ─────────────────────────────────────────

  function renderStepContent(paso: number) {
    const completed = progress.completedSteps;
    const blocked = isBlocked(paso, completed);

    switch (paso) {
      case 1:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              El primer paso es completar el formulario oficial <strong>FI-GDF-016</strong> y enviarlo al portal de certificación de la DGII. Este formulario registra la empresa como emisor electrónico.
            </p>
            <InstructionList items={[
              'Accede al Portal de Certificación DGII (enlace abajo)',
              'Inicia sesión con las credenciales tributarias del emisor (RNC + clave DGII)',
              'Completa el formulario FI-GDF-016 con razón social, RNC, dirección y tipos de comprobante a emitir',
              'En la sección "Proveedor de Servicios", indica que usas los servicios de Villar JA',
              'Adjunta el certificado digital INDOTEL vigente del emisor en formato .p12',
              'Envía el formulario y guarda el número de solicitud asignado por la DGII',
            ]} />
            <DGIIPortalLink />
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 2:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              La DGII proporciona un archivo Excel con <strong>25 comprobantes pre-asignados</strong>. Cada e-NCF debe enviarse al ambiente <strong>certecf</strong> exactamente como la DGII lo indica. Si cualquier envío falla, la DGII reinicia todos los casos.
            </p>
            <AlertBox type="info">
              <strong>Antes de comenzar:</strong> Descarga el Excel del set de pruebas desde el portal DGII después de que aprueben tu solicitud (Paso 1).
            </AlertBox>
            <button
              className="btn btn-primary"
              onClick={onOpenTestSet}
              disabled={blocked}
              style={{
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Icon name="shield" size={16} />
              Gestionar Set de Pruebas
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
              Importa el Excel del set de pruebas, envía cada comprobante al certecf y confirma que todos están aceptados antes de marcar este paso como completado.
            </p>
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 3:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              La DGII proporciona un archivo Excel con los casos para <strong>pruebas de aprobación comercial (ACECF)</strong>. Descárgalo del portal certecf, impórtalo aquí y envía cada XML de respuesta firmado al certecf.
            </p>
            <AlertBox type="info">
              <strong>Proceso automático:</strong> El sistema construye y firma cada XML de ACECF con el certificado del emisor. Solo debes importar el Excel, revisar la respuesta por fila (Aprobar / Rechazar) y enviar. El paso se marcará completado automáticamente cuando todos los casos sean aceptados.
            </AlertBox>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => setShowAprobacion(true)}
                disabled={blocked}
                style={{ fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Icon name="checkcircle" size={16} />
                Gestionar Aprobaciones Comerciales
              </button>
              <DGIIPortalLink />
            </div>
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 4:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              Emite comprobantes con <strong>datos reales del emisor</strong> en certecf usando las secuencias propias del cliente. Esto valida el flujo completo: generación, firma y envío con el certificado INDOTEL del emisor.
            </p>
            {!isCompleted(3, completed) && !isCompleted(4, completed) && (
              <AlertBox type="warning">
                <strong>Prerequisito:</strong> Completa el Paso 3 — Pruebas de Aprobación Comercial antes de continuar con la simulación.
              </AlertBox>
            )}
            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, margin: '0.875rem 0 0.375rem', color: 'var(--text)' }}>
              Comprobantes a emitir en certecf
            </h4>
            <div style={{ marginBottom: '0.875rem', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {[
                { tipo: 31, label: 'Comprobante de Crédito Fiscal', required: true },
                { tipo: 32, label: 'Factura de Consumo Electrónica (≥ RD$250K) / RFCE (< RD$250K)', required: true },
                { tipo: 33, label: 'Nota de Débito', required: false },
                { tipo: 34, label: 'Nota de Crédito', required: false },
                { tipo: 41, label: 'Registro Único de Ingresos', required: false },
                { tipo: 43, label: 'Régimen Especial', required: false },
                { tipo: 44, label: 'Gubernamental', required: false },
                { tipo: 45, label: 'Exportaciones', required: false },
                { tipo: 46, label: 'Gastos Menores', required: false },
                { tipo: 47, label: 'Regímenes Especiales de Producción', required: false },
              ].map(({ tipo, label, required }, i, arr) => (
                <div key={tipo} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.375rem 0.75rem', fontSize: '0.8125rem',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  background: 'transparent',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono, monospace)', fontSize: '0.7rem',
                    color: 'var(--text-muted)', minWidth: 24,
                  }}>
                    T{tipo}
                  </span>
                  <span style={{ flex: 1, color: 'var(--text)' }}>{label}</span>
                  {required ? (
                    <span className="badge err" style={{ fontSize: '0.65rem' }}>Requerido</span>
                  ) : (
                    <span className="badge draft" style={{ fontSize: '0.65rem' }}>Si aplica</span>
                  )}
                </div>
              ))}
            </div>
            <InstructionList items={[
              'Confirma que el emisor tiene secuencias activas para certecf (pestaña "Secuencias")',
              'Ve al módulo de Facturas del cliente y crea al menos un Crédito Fiscal (T31)',
              'Crea también una Factura de Consumo (T32) — ambos tipos son requeridos por la DGII',
              'Si el emisor usará otros tipos, emite al menos uno de cada tipo marcado como "Si aplica"',
              'Verifica que cada comprobante devuelva estado "aceptada" en certecf antes de continuar',
            ]} />
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 5:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              Descarga las <strong>representaciones impresas (PDF)</strong> de los e-CF emitidos en el <strong>Paso 4</strong> y súbelas al portal DGII. Este es el paso oficial donde la DGII revisa formato, contenido mínimo, QR y consistencia entre el PDF y el e-CF remitido.
            </p>
            {!isCompleted(4, completed) && !isCompleted(5, completed) && (
              <AlertBox type="warning">
                <strong>Prerequisito:</strong> Completa primero el Paso 4. Las representaciones impresas deben salir de comprobantes reales emitidos en <strong>certecf</strong>.
              </AlertBox>
            )}
            <AlertBox type="info">
              Según DGII, las representaciones impresas deben remitirse en <strong>PDF</strong> y el tamaño máximo permitido por carga es <strong>10 MB</strong>. Deben reflejar los datos del e-CF de simulación: e-NCF, RNCs, fecha, montos, código de seguridad y código QR.
            </AlertBox>
            {facturasLoading ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Cargando comprobantes de simulación…</p>
            ) : riFacturas.length === 0 ? (
              <AlertBox type="warning">
                Aún no aparecen e-CF aceptados en <strong>certecf</strong> para descargar como PDF. Emite primero los comprobantes del Paso 4 y vuelve a esta pantalla.
              </AlertBox>
            ) : (
              <div style={{ marginBottom: '1rem', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '0.625rem 0.75rem', background: 'var(--surface-alt, #f9f9f8)', borderBottom: '1px solid var(--border)' }}>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text)' }}>PDFs listos desde simulación</strong>
                  <div style={{ marginTop: '0.2rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Descarga estos archivos y súbelos al portal DGII en la sección de Representaciones Impresas.
                  </div>
                </div>
                {riFacturas.map((factura) => (
                  <FacturaEvidenceRow
                    key={factura.id}
                    factura={factura}
                    onDownloadXml={(current) => downloadEcfFile(current, 'xml')}
                    onDownloadPdf={(current) => downloadEcfFile(current, 'pdf')}
                  />
                ))}
              </div>
            )}
            {missingSimulationTypes.length > 0 && (
              <AlertBox type="warning">
                Todavía faltan comprobantes base del Paso 4 para: <strong>{missingSimulationTypes.map((tipo) => `T${tipo}`).join(', ')}</strong>.
              </AlertBox>
            )}
            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, margin: '0.875rem 0 0.5rem', color: 'var(--text)' }}>
              Checklist por tipo a cargar
            </h4>
            <div style={{ marginBottom: '0.875rem' }}>
              {ECF_TYPES_RI.map(({ tipo, label }) => (
                <TypeCheckRow
                  key={tipo}
                  tipo={tipo}
                  label={label}
                  checked={checkedRITypes.has(tipo)}
                  onToggle={() => toggleRIType(tipo)}
                  required={tipo === 31 || tipo === 32}
                />
              ))}
            </div>
            <InstructionList items={[
              'Descarga el PDF de cada e-CF emitido en certecf que vayas a presentar como evidencia',
              'Abre el portal DGII → Certificación → Representaciones Impresas',
              'Selecciona el tipo de comprobante correcto y sube el PDF correspondiente',
              'Marca en esta lista cada tipo que ya sometiste en DGII para llevar control visual del set cargado',
              'Cuando termines la carga de todos los tipos aplicables, marca este paso como completado',
            ]} />
            <DGIIPortalLink />
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 6:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              En este paso esperas la <strong>respuesta de la DGII</strong> sobre las representaciones impresas cargadas. Si alguna es rechazada, corrígela y vuelve al <strong>Paso 5</strong> para reenviar el PDF correspondiente.
            </p>
            {checkedRITypesSorted.length > 0 ? (
              <AlertBox type="success">
                Tipos marcados como cargados en DGII: <strong>{checkedRILabels.join(', ')}</strong>.
              </AlertBox>
            ) : (
              <AlertBox type="warning">
                Aún no has marcado ningún tipo como cargado en el Paso 5. Si ya subiste PDFs en DGII, regresa y marca los tipos para dejar evidencia visual.
              </AlertBox>
            )}
            <AlertBox type="info">
              La DGII puede responder <strong>Aprobada</strong> o <strong>Rechazada</strong>. Si rechaza una representación impresa, ajusta el PDF en el sistema, vuelve a descargarlo y remítelo de nuevo desde el portal.
            </AlertBox>
            <InstructionList items={[
              'Revisa en el portal DGII el resultado de cada representación impresa cargada en el Paso 5',
              'Si un PDF fue rechazado, corrige el documento fuente, descarga nuevamente el PDF y súbelo otra vez',
              'No avances al Paso 7 hasta que la DGII confirme que las representaciones impresas están aprobadas',
              'Marca este paso cuando el set de representaciones esté aceptado por la DGII',
            ]} />
            <DGIIPortalLink />
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 7:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              Registra estas <strong>4 URLs</strong> en el portal DGII como las URLs del servicio de facturación del emisor en el ambiente <strong>certecf</strong>. Nuestro receptor centralizado atiende a todos los emisores.
            </p>
            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, margin: '0.875rem 0 0.625rem', color: 'var(--text)' }}>
              URLs a registrar en el portal DGII (certecf)
            </h4>
            <URLCard label="Autenticación — Semilla" url={SERVICE_URLS.autenticacion} />
            <URLCard label="Autenticación — Token" url={SERVICE_URLS.token} />
            <URLCard label="Recepción de e-CF" url={SERVICE_URLS.recepcion} />
            <URLCard label="Aprobación Comercial" url={SERVICE_URLS.aprobacion} />
            <InstructionList items={[
              'Ve al portal DGII → "Configuración de URLs de Servicio" en el ambiente certecf',
              'Ingresa las 4 URLs mostradas arriba en sus campos correspondientes',
              'Guarda los cambios y confirma que la DGII las acepta sin errores',
            ]} />
            <DGIIPortalLink />
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 8:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              La DGII habilita el inicio de las <strong>pruebas de comunicación</strong>. Aquí debes preparar la recepción del emisor: descargar el <strong>certificado raíz DGII</strong>, dejar listas las URLs del paso 7 e indicar en el portal que el receptor está listo para recibir e-CF de prueba.
            </p>
            <AlertBox type="info">
              La validación interna de firma que ves abajo es una ayuda técnica de Villar JA. Sirve para comprobar el certificado del emisor, pero el paso oficial de DGII también incluye la preparación del receptor y el certificado raíz.
            </AlertBox>
            {!company.cert && (
              <AlertBox type="error">
                No hay certificado digital cargado para este emisor. Carga el certificado .p12 desde el botón "Certificado Digital" antes de continuar.
              </AlertBox>
            )}
            <InstructionList items={[
              'Descarga el certificado raíz DGII desde el portal certecf si la prueba de comunicación lo solicita',
              'Verifica que las URLs del Paso 7 siguen registradas correctamente',
              'Confirma en el portal DGII que el receptor está listo para recibir e-CF de prueba',
              'Usa la prueba de firma de abajo como validación técnica adicional antes de marcar el paso',
            ]} />
            <button
              className="btn btn-primary"
              onClick={runTestFirma}
              disabled={testFirmaLoading || !company.cert || blocked}
              style={{
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {testFirmaLoading
                ? 'Probando…'
                : <><Icon name="shield" size={15} />Probar Firma Digital</>}
            </button>
            {testFirmaResult && (
              <div style={{
                marginTop: '1rem',
                background: testFirmaResult.ok ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${testFirmaResult.ok ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: 8,
                padding: '0.75rem 1rem',
                fontSize: '0.8125rem',
                color: testFirmaResult.ok ? '#15803d' : '#dc2626',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                lineHeight: 1.55,
              }}>
                <Icon
                  name={testFirmaResult.ok ? 'check' : 'x'}
                  size={15}
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                {testFirmaResult.message}
              </div>
            )}
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 9:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              La DGII envía e-CF de prueba al endpoint de recepción del emisor para verificar que el servicio funciona correctamente. Nuestro receptor valida la firma DGII, registra cada e-CF y genera un <strong>Acuse de Recibo (ARECF)</strong> automáticamente.
            </p>
            <AlertBox type="success">
              <strong>Automático:</strong> El receptor en <code style={{ fontSize: '0.75rem' }}>ecf.villarja.com</code> procesa todos los e-CF inbound del certecf y responde con el ARECF firmado con el certificado del emisor.
            </AlertBox>
            <URLCard label="URL Recepción activa (certecf)" url={SERVICE_URLS.recepcion} />
            <InstructionList items={[
              'Confirma con la DGII que han enviado los e-CF de prueba a la URL de Recepción registrada en el Paso 7',
              'Ve a la pestaña "Recepciones" del emisor y verifica que aparecen los comprobantes inbound del certecf',
              'Si no hay recepciones en 24 h, revisa que la URL del Paso 7 esté correctamente guardada en el portal DGII',
              'Una vez confirmado que la DGII envió y el sistema recibió, marca este paso como completado',
            ]} />
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 10:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              Una vez superado el Paso 9, debes <strong>indicar a la DGII</strong> que el receptor está listo para la prueba de <strong>Aprobaciones Comerciales (ACECF)</strong>. Desde ese momento la DGII podrá empezar a enviar ACECF de prueba al endpoint registrado.
            </p>
            <AlertBox type="success">
              <strong>Automático:</strong> Cuando la DGII inicie esta prueba, Villar JA procesará las ACECF inbound en el receptor centralizado y podrás verificarlas luego en el Paso 11.
            </AlertBox>
            <InstructionList items={[
              'En el portal DGII, selecciona la opción para iniciar la prueba de aprobaciones comerciales',
              'Confirma que las URLs del Paso 7 no hayan cambiado y que el certificado del emisor siga vigente',
              'Coordina con la DGII el momento de envío de las ACECF de prueba',
              'Marca este paso cuando la DGII confirme que la prueba fue iniciada',
            ]} />
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 11:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              La DGII envía <strong>Aprobaciones Comerciales (ACECF)</strong> de prueba al endpoint de aprobaciones del emisor para verificar que el servicio procesa correctamente las respuestas inbound.
            </p>
            <AlertBox type="success">
              <strong>Automático:</strong> El receptor en <code style={{ fontSize: '0.75rem' }}>ecf.villarja.com</code> procesa las ACECF inbound en tiempo real. Las entradas de tipo "aprobación" aparecen en la pestaña Recepciones.
            </AlertBox>
            <URLCard label="URL Aprobación Comercial activa (certecf)" url={SERVICE_URLS.aprobacion} />
            <InstructionList items={[
              'Ve a la pestaña "Recepciones" del emisor y verifica que hay entradas de tipo "aprobación" del certecf',
              'Confirma con la DGII que el flujo de ACECF inbound fue procesado correctamente',
              'Si no hay recepciones ACECF, revisa que la URL de Aprobación Comercial del Paso 7 esté correctamente registrada',
              'Marca este paso cuando la DGII confirme el flujo de aprobaciones comerciales inbound',
            ]} />
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 12:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              Registra las <strong>4 URLs de producción</strong> en el portal DGII. Son las mismas URLs del Paso 7 — nuestro receptor centralizado atiende tanto certecf como el ambiente de producción.
            </p>
            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, margin: '0.875rem 0 0.625rem', color: 'var(--text)' }}>
              URLs de producción a registrar
            </h4>
            <URLCard label="Autenticación — Semilla" url={SERVICE_URLS.autenticacion} />
            <URLCard label="Autenticación — Token" url={SERVICE_URLS.token} />
            <URLCard label="Recepción de e-CF" url={SERVICE_URLS.recepcion} />
            <URLCard label="Aprobación Comercial" url={SERVICE_URLS.aprobacion} />
            <InstructionList items={[
              'Ve al portal DGII → sección de configuración de producción ("URLs de Servicio — ecf")',
              'Ingresa las 4 URLs mostradas arriba en sus campos de producción',
              'Guarda y confirma que la DGII las acepta sin errores',
              'Las URLs son las mismas que certecf — el receptor atiende ambos ambientes simultáneamente',
            ]} />
            <DGIIPortalLink />
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 13:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              Firma y envía la <strong>Declaración Jurada de Cumplimiento</strong> al portal DGII. Este documento certifica que el emisor cumple con todos los requisitos técnicos y legales de la facturación electrónica.
            </p>
            <InstructionList items={[
              'Ve al portal DGII → sección "Declaración Jurada" o "Cumplimiento"',
              'Lee detenidamente el contenido del documento de declaración jurada',
              'Firma electrónicamente usando el certificado digital INDOTEL del emisor',
              'Envía el documento firmado y guarda el número de confirmación asignado por la DGII',
            ]} />
            <DGIIPortalLink />
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 14:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              La DGII verifica que el contribuyente está <strong>al día con sus obligaciones tributarias</strong> antes de activar el ambiente de producción.
            </p>
            <InstructionList items={[
              'Verifica que el RNC del emisor esté activo en el padrón de contribuyentes de la DGII',
              'Confirma que no hay declaraciones pendientes ni deudas tributarias',
              'Si hay incumplimientos, el emisor debe regularizarlos antes de continuar con la certificación',
              'La DGII puede verificar esto automáticamente — confirma el estado con ellos directamente',
            ]} />
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 15: {
        const done = isCompleted(paso, completed);
        return done ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--success-bg, #dcfce7)',
              border: '2.5px solid var(--success, #16a34a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <Icon name="checkcircle" size={32} style={{ color: 'var(--success, #16a34a)' }} />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)' }}>
              {company.razon} está certificado
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              El emisor puede emitir comprobantes fiscales electrónicos en el ambiente de producción.
              Recuerda cambiar el ambiente de la empresa a <strong>ecf</strong> y crear las secuencias de producción.
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              Tras completar todos los pasos anteriores, la DGII <strong>activa el ambiente de producción</strong> del emisor. Una vez activado, puede emitir comprobantes reales.
            </p>
            <InstructionList items={[
              'Espera la confirmación oficial de la DGII de que el ambiente ecf ha sido activado',
              'Cambia el ambiente del emisor a "ecf" desde el botón "Cambiar Ambiente"',
              'Crea las secuencias de producción en la pestaña "Secuencias"',
              'Realiza un comprobante de prueba en producción para confirmar que todo funciona',
              'Notifica al emisor que ya puede facturar electrónicamente',
            ]} />
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );
      }

      default:
        return null;
    }
  }

  // ─── Step detail wrapper ──────────────────────────────────────────────────────

  function renderStepDetail() {
    const completed = progress.completedSteps;
    const done = isCompleted(selectedPaso, completed);
    const blocked = isBlocked(selectedPaso, completed);
    const step = CERT_STEPS.find((s) => s.paso === selectedPaso)!;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Step header */}
        <div style={{
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border)',
          marginBottom: '1.25rem',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
            <span style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: done ? 'var(--success-bg, #dcfce7)' : 'var(--surface-alt, #f9f9f8)',
              border: `2px solid ${done ? 'var(--success, #16a34a)' : 'var(--border)'}`,
              fontSize: '0.75rem',
              fontWeight: 700,
              color: done ? 'var(--success, #16a34a)' : 'var(--text-muted)',
            }}>
              {done ? <Icon name="check" size={15} /> : selectedPaso}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
                  {step.titulo}
                </h3>
                <span className={`badge ${TIPO_BADGE[step.tipo]}`} style={{ fontSize: '0.7rem' }}>
                  {TIPO_LABEL[step.tipo]}
                </span>
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {step.descripcion}
              </p>
            </div>
          </div>
        </div>

        {/* Blocked warning */}
        {blocked && (
          <AlertBox type="warning">
            Este paso requiere completar el <strong>Paso {selectedPaso - 1}</strong> primero.
          </AlertBox>
        )}

        {/* Mark error */}
        {markError && !blocked && (
          <AlertBox type="error">
            {markError}
          </AlertBox>
        )}

        {/* Step content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {renderStepContent(selectedPaso)}
        </div>
      </div>
    );
  }

  // ─── Loading state ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        padding: '4rem',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.875rem',
      }}>
        Cargando progreso de certificación…
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header card: status + progress bar */}
      <div className="card" style={{ padding: '1rem 1.375rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.875rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text)' }}>
              Proceso de Certificación DGII
            </h3>
            <p style={{ margin: '0.125rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {completedCount} de {totalSteps} pasos completados
            </p>
          </div>
          <span className={`badge ${statusInfo.cls}`} style={{ fontSize: '0.8rem' }}>
            {statusInfo.label}
          </span>
        </div>
        <div style={{
          height: 6,
          borderRadius: 9999,
          background: 'var(--border)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            borderRadius: 9999,
            width: `${pct}%`,
            background: progress.status === 'certificada'
              ? 'var(--success, #16a34a)'
              : 'var(--brand)',
            transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          }} />
        </div>
      </div>

      {/* Approval modal for Paso 3 */}
      {showAprobacion && (
        <AprobacionModal
          company={company}
          onClose={() => setShowAprobacion(false)}
          onAllSent={() => {
            if (!progress.completedSteps.includes(3)) {
              markStep(3, 'complete');
            }
          }}
        />
      )}

      {/* Two-column layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        gap: '1rem',
        alignItems: 'start',
      }}>

        {/* Left column: step list */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {CERT_STEPS.map((step, idx) => {
            const completed = progress.completedSteps;
            const done = isCompleted(step.paso, completed);
            const blocked = isBlocked(step.paso, completed);
            const selected = step.paso === selectedPaso;

            return (
              <button
                key={step.paso}
                onClick={() => { setSelectedPaso(step.paso); setMarkError(''); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.625rem 0.875rem',
                  background: selected ? 'var(--surface-alt, #f9f9f8)' : 'transparent',
                  borderBottom: idx < CERT_STEPS.length - 1 ? '1px solid var(--border)' : 'none',
                  border: 'none',
                  borderLeft: selected
                    ? '3px solid var(--brand)'
                    : '3px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s ease',
                }}
              >
                <span style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: done ? 'var(--success-bg, #dcfce7)' : 'transparent',
                  border: `1.5px solid ${stepBorderColor(step.paso, completed, selectedPaso)}`,
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  color: stepBorderColor(step.paso, completed, selectedPaso),
                  transition: 'all 0.12s ease',
                }}>
                  {done ? <Icon name="check" size={11} /> : step.paso}
                </span>

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{
                    fontSize: '0.775rem',
                    fontWeight: selected || done ? 600 : 400,
                    color: stepTextColor(step.paso, completed, selectedPaso),
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.4,
                  }}>
                    {step.titulo}
                  </div>
                  {done && (
                    <div style={{ fontSize: '0.675rem', color: 'var(--success, #16a34a)', lineHeight: 1.3 }}>
                      Completado
                    </div>
                  )}
                  {blocked && !done && (
                    <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      Bloqueado
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right column: step detail panel */}
        <div className="card" style={{ padding: '1.375rem', minHeight: 420 }}>
          {renderStepDetail()}
        </div>
      </div>
    </div>
  );
}
