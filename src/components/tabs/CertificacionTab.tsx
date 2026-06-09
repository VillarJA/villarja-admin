'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/Icons';
import type { Company } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const ECF_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://ecf.villarja.com';

const SERVICE_URLS = {
  autenticacion: `${ECF_BASE}/fe/autenticacion/api/semilla`,
  recepcion: `${ECF_BASE}/fe/recepcion/api/ecf`,
  aprobacion: `${ECF_BASE}/fe/aprobacioncomercial/api/ecf`,
};

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
  { paso: 4,  titulo: 'Pruebas de simulación',              descripcion: 'Emitir comprobantes con datos reales del emisor en certecf',                    tipo: 'automatic' },
  { paso: 5,  titulo: 'Representación impresa — Tipo 31',   descripcion: 'Subir la representación impresa del Crédito Fiscal al portal DGII',             tipo: 'hybrid'    },
  { paso: 6,  titulo: 'Representaciones impresas restantes',descripcion: 'Subir representaciones de todos los tipos de comprobante usados',               tipo: 'hybrid'    },
  { paso: 7,  titulo: 'URLs de servicio — certecf',         descripcion: 'Registrar las 3 URLs del servicio de facturación en el portal DGII',            tipo: 'hybrid'    },
  { paso: 8,  titulo: 'Prueba de certificado digital',      descripcion: 'Validar que el certificado INDOTEL firma documentos correctamente',             tipo: 'automatic' },
  { paso: 9,  titulo: 'Recepción de e-CF inbound',          descripcion: 'Confirmar que el receptor procesa comprobantes de otros emisores',              tipo: 'hybrid'    },
  { paso: 10, titulo: 'Acuse de recibo',                    descripcion: 'Confirmar que el sistema genera acuses de recibo automáticamente',              tipo: 'hybrid'    },
  { paso: 11, titulo: 'Aprobación comercial inbound',       descripcion: 'Confirmar respuesta a aprobaciones comerciales recibidas',                      tipo: 'hybrid'    },
  { paso: 12, titulo: 'URLs de servicio — producción',      descripcion: 'Registrar las 3 URLs de producción en el portal DGII',                         tipo: 'hybrid'    },
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
  const [testFirmaResult, setTestFirmaResult] = useState<TestFirmaResult | null>(null);
  const [testFirmaLoading, setTestFirmaLoading] = useState(false);

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

  // ── Mark / unmark a step ──
  const markStep = async (paso: number, action: 'complete' | 'undo') => {
    setMarking(true);
    try {
      const res = await fetch('/api/certification/progress', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: paso, action }),
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        setProgress((prev) => ({
          ...prev,
          status: data.status,
          completedSteps: data.completedSteps,
        }));
      }
    } catch {
      // non-fatal
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
              La DGII proporciona un <strong>segundo set de pruebas Excel</strong> exclusivo para aprobaciones comerciales. Cada fila corresponde a un e-CF recibido al que debes emitir una respuesta de aprobación o rechazo hacia el ambiente <strong>certecf</strong>.
            </p>
            <AlertBox type="info">
              <strong>Acción requerida:</strong> Este paso es activo — descarga el Excel de aprobaciones desde el portal DGII certecf y envía cada respuesta usando el endpoint de aprobación comercial del sistema. No es automático.
            </AlertBox>
            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, margin: '0.875rem 0 0.5rem', color: 'var(--text)' }}>
              URL de Aprobación Comercial
            </h4>
            <URLCard label="Aprobación Comercial" url={SERVICE_URLS.aprobacion} />
            <InstructionList items={[
              'Inicia sesión en el portal DGII certecf y descarga el Excel del set de pruebas de aprobaciones',
              'Por cada fila del Excel, genera y envía un XML de aprobación o rechazo comercial al certecf',
              'Usa el endpoint POST /api/v1/dgii/aprobacion del sistema para construir y firmar cada respuesta',
              'Si cualquier envío falla, la DGII puede reiniciar la secuencia — verifica el estado en el portal antes de continuar',
              'Todos los casos deben quedar en estado "aceptada" antes de marcar este paso como completado',
            ]} />
            <DGIIPortalLink />
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 4:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              Emite comprobantes de prueba con <strong>datos reales del emisor</strong> (no del set DGII) usando el ambiente <strong>certecf</strong>. Esto valida el flujo completo de creación, firma y envío con las secuencias propias.
            </p>
            <InstructionList items={[
              'Confirma que el emisor tiene secuencias creadas para el ambiente certecf en la pestaña "Secuencias"',
              'Ve al módulo de facturas y crea al menos un comprobante de cada tipo que el emisor utilizará',
              'Envía los comprobantes seleccionando el ambiente certecf',
              'Verifica que la DGII devuelve estado "aceptada" para cada comprobante',
              'Realiza al menos una prueba con Crédito Fiscal (Tipo 31) y una con Consumo (Tipo 32)',
            ]} />
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 5:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              Sube al portal DGII la <strong>representación impresa</strong> (diseño PDF) del <strong>Comprobante de Crédito Fiscal (Tipo 31)</strong>. Este es el formato visual que se entrega al comprador.
            </p>
            <AlertBox type="info">
              El PDF debe incluir todos los campos requeridos: RNC emisor y comprador, NCF, fecha, desglose de ITBIS, importe total, código QR y firma digital.
            </AlertBox>
            <InstructionList items={[
              'Genera un PDF de muestra de un Crédito Fiscal (Tipo 31) desde el módulo de facturas',
              'Verifica que el PDF contiene todos los campos requeridos por la DGII',
              'Ve al portal DGII → sección "Representaciones Impresas"',
              'Sube el PDF del Tipo 31 y confirma que la DGII lo acepta',
            ]} />
            <DGIIPortalLink />
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 6:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              Sube representaciones impresas para <strong>todos los tipos de comprobante</strong> que el emisor utilizará. La DGII valida el formato de cada tipo antes de aprobar la certificación.
            </p>
            <InstructionList items={[
              'Identifica todos los tipos de comprobante que el emisor emitirá (32, 33, 34, 41, 43, 44, 45, 46, 47)',
              'Genera un PDF de muestra por cada tipo adicional desde el módulo de facturas',
              'Sube cada representación en el portal DGII → "Representaciones Impresas"',
              'Confirma que la DGII marca todos los tipos como aprobados antes de continuar',
            ]} />
            <DGIIPortalLink />
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 7:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              Registra estas URLs en el portal DGII como las URLs del servicio de facturación del emisor en el ambiente <strong>certecf</strong>. Nuestro receptor centralizado atiende a todos los emisores.
            </p>
            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, margin: '0.875rem 0 0.625rem', color: 'var(--text)' }}>
              URLs a registrar en el portal DGII
            </h4>
            <URLCard label="URL Autenticación" url={SERVICE_URLS.autenticacion} />
            <URLCard label="URL Recepción de e-CF" url={SERVICE_URLS.recepcion} />
            <URLCard label="URL Aprobación Comercial" url={SERVICE_URLS.aprobacion} />
            <InstructionList items={[
              'Ve al portal DGII → "Configuración de URLs de Servicio" (certecf)',
              'Ingresa las 3 URLs mostradas arriba en sus campos correspondientes',
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
              Verifica que el <strong>certificado digital INDOTEL</strong> del emisor está cargado correctamente y puede firmar documentos XML. Esta prueba firma un XML de muestra con el certificado registrado.
            </p>
            {!company.cert && (
              <AlertBox type="error">
                No hay certificado digital cargado para este emisor. Carga el certificado .p12 desde el botón "Certificado Digital" antes de continuar.
              </AlertBox>
            )}
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
              La DGII enviará comprobantes electrónicos de prueba al receptor del emisor en certecf. Nuestro receptor los procesa automáticamente y los registra en la pestaña <strong>Recepciones</strong>.
            </p>
            <AlertBox type="success">
              <strong>Automático:</strong> El receptor en ecf.villarja.com procesa todos los e-CF inbound firmados por el certecf. Verifica en la pestaña "Recepciones" que hayan llegado comprobantes.
            </AlertBox>
            <URLCard label="URL Recepción activa" url={SERVICE_URLS.recepcion} />
            <InstructionList items={[
              'Confirma con la DGII que han enviado los comprobantes de prueba a la URL de Recepción',
              'Verifica en la pestaña "Recepciones" del emisor que los e-CF aparecen como recibidos',
              'Si no hay recepciones en 24 h, confirma que la URL del Paso 7 esté correctamente registrada',
            ]} />
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 10:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              Al recibir un e-CF inbound (Paso 9), el sistema debe generar y enviar un <strong>acuse de recibo</strong> firmado digitalmente. Nuestro receptor genera y envía acuses automáticamente.
            </p>
            <AlertBox type="success">
              <strong>Automático:</strong> Los acuses de recibo se generan con el certificado del emisor y se envían a la DGII inmediatamente al procesar cada e-CF inbound.
            </AlertBox>
            <InstructionList items={[
              'Confirma con la DGII que recibieron los acuses de recibo de los comprobantes enviados en el Paso 9',
              'Los acuses están firmados con el certificado del emisor y enviados al certecf automáticamente',
              'Si la DGII reporta que no recibió acuses, verifica que el certificado del emisor esté activo',
            ]} />
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 11:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              La DGII verifica que el emisor responde correctamente a <strong>aprobaciones comerciales inbound</strong>. Nuestro receptor las procesa automáticamente.
            </p>
            <AlertBox type="success">
              <strong>Automático:</strong> Las aprobaciones y rechazos inbound se procesan por el receptor en tiempo real. Las recepciones de tipo "aprobacion" aparecen en la pestaña Recepciones.
            </AlertBox>
            <InstructionList items={[
              'Verifica en la pestaña "Recepciones" del emisor que hay entradas de tipo "aprobacion" del certecf',
              'Confirma con la DGII que el flujo de aprobación comercial fue procesado correctamente',
            ]} />
            <ConfirmButton paso={paso} completed={completed} onMark={markStep} loading={marking} />
          </>
        );

      case 12:
        return (
          <>
            <p style={{ fontSize: '0.8375rem', color: 'var(--text)', lineHeight: 1.65, marginTop: 0 }}>
              Registra las URLs de <strong>producción</strong> en el portal DGII. Son las mismas URLs del Paso 7 ya que nuestro receptor centralizado atiende tanto certecf como el ambiente de producción.
            </p>
            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, margin: '0.875rem 0 0.625rem', color: 'var(--text)' }}>
              URLs de producción a registrar
            </h4>
            <URLCard label="URL Autenticación" url={SERVICE_URLS.autenticacion} />
            <URLCard label="URL Recepción de e-CF" url={SERVICE_URLS.recepcion} />
            <URLCard label="URL Aprobación Comercial" url={SERVICE_URLS.aprobacion} />
            <InstructionList items={[
              'Ve al portal DGII → sección de configuración de producción ("URLs de Servicio — ecf")',
              'Ingresa las 3 URLs mostradas arriba en sus campos de producción',
              'Guarda y confirma que la DGII las acepta sin errores',
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
                <span className={`badge badge-${TIPO_BADGE[step.tipo]}`} style={{ fontSize: '0.7rem' }}>
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
          <span className={`badge badge-${statusInfo.cls}`} style={{ fontSize: '0.8rem' }}>
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
                onClick={() => setSelectedPaso(step.paso)}
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
