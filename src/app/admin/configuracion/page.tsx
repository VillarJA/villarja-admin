'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/Icons';
import { useToast } from '@/components/ui/Toast';
import { getAuditLog, getPortalConfig, upsertPortalConfig } from '@/lib/data-layer';
import type { PortalConfig } from '@/lib/data-layer';
import type { AuditLog } from '@/types';

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 24, padding: '13px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ paddingTop: 6 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0, minWidth: 240, display: 'flex', justifyContent: 'flex-end' }}>
        {children}
      </div>
    </div>
  );
}

function ToggleRow({
  label, hint, value, onChange,
}: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 24, padding: '13px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{hint}</div>}
      </div>
      <button
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        style={{
          width: 42, height: 24, borderRadius: 14, border: 'none',
          background: value ? 'var(--brand)' : 'var(--border-strong)',
          position: 'relative', flexShrink: 0, transition: 'background .15s',
          cursor: 'pointer',
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: value ? 21 : 3,
          width: 18, height: 18, borderRadius: '50%', background: 'var(--surface)',
          transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  );
}

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<'cuenta' | 'dgii' | 'seguridad' | 'auditoria'>('cuenta');
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
  const [cfg, setCfg] = useState<PortalConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastNode, toast] = useToast();

  useEffect(() => {
    Promise.all([getPortalConfig(), getAuditLog()]).then(([config, log]) => {
      setCfg(config);
      setAuditLog(log);
    });
  }, []);

  const set = (key: keyof PortalConfig) => (value: string | boolean | number) => {
    setCfg((c) => c ? { ...c, [key]: value } : c);
  };

  const handleSave = async () => {
    if (!cfg) return;
    setSaving(true);
    try {
      await upsertPortalConfig(cfg);
      toast('Cambios guardados exitosamente');
    } catch (err) {
      toast('Error al guardar: ' + (err instanceof Error ? err.message : 'Intenta de nuevo'));
    } finally {
      setSaving(false);
    }
  };

  const tabs: [typeof tab, string][] = [
    ['cuenta', 'Cuenta'],
    ['dgii', 'Ambiente DGII'],
    ['seguridad', 'CORS y Seguridad'],
    ['auditoria', 'Auditoría'],
  ];

  if (!cfg) {
    return (
      <div className="content-wrap">
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
          Cargando…
        </div>
      </div>
    );
  }

  return (
    <div className="content-wrap fade-in">
      <div className="page-head">
        <div>
          <h1>Configuración</h1>
          <p>Ajustes de la cuenta y la plataforma e-CF</p>
        </div>
      </div>

      <div className="card">
        <div className="tabs" style={{ padding: '0 8px' }}>
          {tabs.map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        <div className="card-pad">
          {tab === 'cuenta' && (
            <div style={{ maxWidth: 560 }}>
              <SettingRow label="Nombre del administrador" hint="Visible en el registro de auditoría">
                <input className="cfg-inp" value={cfg.adminName} onChange={(e) => set('adminName')(e.target.value)} />
              </SettingRow>
              <SettingRow label="Correo de la cuenta" hint="Para notificaciones y acceso">
                <input className="cfg-inp" type="email" value={cfg.adminEmail} onChange={(e) => set('adminEmail')(e.target.value)} />
              </SettingRow>
              <SettingRow label="Razón social emisora" hint="Datos fiscales de Villar JA">
                <input className="cfg-inp" value={cfg.razonSocial} onChange={(e) => set('razonSocial')(e.target.value)} />
              </SettingRow>
              <SettingRow label="RNC de la empresa">
                <input className="cfg-inp mono" value={cfg.rnc} onChange={(e) => set('rnc')(e.target.value)} />
              </SettingRow>
              <div style={{ marginTop: 18 }}>
                <button className="btn primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          )}

          {tab === 'dgii' && (
            <div style={{ maxWidth: 620 }}>
              <div className="note info" style={{ marginBottom: 18 }}>
                <Icon name="globe" />
                <div>Las URLs apuntan a los servicios oficiales de la DGII según el ambiente seleccionado.</div>
              </div>
              <SettingRow label="Ambiente activo" hint="Entorno por defecto para nuevos clientes">
                <div className="seg">
                  {(['testeCF', 'certeCF', 'eCF'] as const).map((a) => (
                    <button
                      key={a}
                      className={a === cfg.ambienteActivo ? 'on' : ''}
                      onClick={() => set('ambienteActivo')(a)}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </SettingRow>
              <SettingRow label="URL recepción e-CF">
                <input className="cfg-inp mono" value={cfg.urlRecepcion} onChange={(e) => set('urlRecepcion')(e.target.value)} />
              </SettingRow>
              <SettingRow label="URL consulta de estado">
                <input className="cfg-inp mono" value={cfg.urlConsultaEstado} onChange={(e) => set('urlConsultaEstado')(e.target.value)} />
              </SettingRow>
              <SettingRow label="URL autenticación (semilla)">
                <input className="cfg-inp mono" value={cfg.urlAutenticacion} onChange={(e) => set('urlAutenticacion')(e.target.value)} />
              </SettingRow>
              <SettingRow label="Timeout de recepción" hint="Antes de activar contingencia">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    className="cfg-inp mono"
                    style={{ width: 80 }}
                    type="number"
                    min={5}
                    max={120}
                    value={cfg.timeoutRecepcion}
                    onChange={(e) => set('timeoutRecepcion')(Number(e.target.value))}
                  />
                  <span className="muted">segundos</span>
                </div>
              </SettingRow>
              <div style={{ marginTop: 18 }}>
                <button className="btn primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {tab === 'seguridad' && (
            <div style={{ maxWidth: 620 }}>
              <SettingRow label="Orígenes CORS permitidos" hint="Dominios autorizados para consumir la API">
                <textarea
                  className="cfg-inp"
                  rows={3}
                  style={{ resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5 }}
                  value={cfg.corsOrigins}
                  onChange={(e) => set('corsOrigins')(e.target.value)}
                />
              </SettingRow>
              <ToggleRow label="Forzar HTTPS" hint="Rechazar peticiones no cifradas" value={cfg.forzarHttps} onChange={set('forzarHttps')} />
              <ToggleRow label="Rate limiting por API Key" hint="Máx. 120 req/min por cliente" value={cfg.rateLimiting} onChange={set('rateLimiting')} />
              <ToggleRow label="Autenticación de 2 factores (admin)" hint="Requerida al iniciar sesión" value={cfg.tfaAdmin} onChange={set('tfaAdmin')} />
              <ToggleRow label="Rotación automática de llaves" hint="Cada 90 días" value={cfg.rotacionLlaves} onChange={set('rotacionLlaves')} />
              <div style={{ marginTop: 18 }}>
                <button className="btn primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {tab === 'auditoria' && (
            <div className="table-wrap" style={{ margin: '-20px', marginTop: -8 }}>
              {auditLog.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
                  No hay entradas de auditoría registradas
                </div>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Objeto</th><th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.map((a, i) => (
                      <tr key={i}>
                        <td className="mono muted" style={{ whiteSpace: 'nowrap' }}>{a.ts}</td>
                        <td className="mono">{a.actor}</td>
                        <td className="strong">{a.accion}</td>
                        <td>{a.obj}</td>
                        <td className="mono muted">{a.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {toastNode}
    </div>
  );
}
