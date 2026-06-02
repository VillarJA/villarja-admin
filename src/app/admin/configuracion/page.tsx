'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/Icons';
import { useToast } from '@/components/ui/Toast';
import { getAuditLog } from '@/lib/data-layer';
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

function ToggleRow({ label, hint, defaultOn }: { label: string; hint?: string; defaultOn: boolean }) {
  const [v, setV] = useState(defaultOn);
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
        onClick={() => setV((v) => !v)}
        style={{
          width: 42, height: 24, borderRadius: 14, border: 'none',
          background: v ? 'var(--brand)' : 'var(--border-strong)',
          position: 'relative', flexShrink: 0, transition: 'background .15s',
          cursor: 'pointer',
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: v ? 21 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  );
}

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<'cuenta' | 'dgii' | 'seguridad' | 'auditoria'>('cuenta');
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
  const [toastNode, toast] = useToast();

  useEffect(() => {
    getAuditLog().then(setAuditLog);
  }, []);

  const tabs: [typeof tab, string][] = [
    ['cuenta', 'Cuenta'],
    ['dgii', 'Ambiente DGII'],
    ['seguridad', 'CORS y Seguridad'],
    ['auditoria', 'Auditoría'],
  ];

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
                <input className="cfg-inp" defaultValue="Villar JA — Admin" />
              </SettingRow>
              <SettingRow label="Correo de la cuenta" hint="Para notificaciones y acceso">
                <input className="cfg-inp" defaultValue="admin@villarja.com" />
              </SettingRow>
              <SettingRow label="Razón social emisora" hint="Datos fiscales de Villar JA">
                <input className="cfg-inp" defaultValue="Villar JA Data y Tecnología, SRL" />
              </SettingRow>
              <SettingRow label="RNC de la empresa">
                <input className="cfg-inp mono" defaultValue="133-29871-4" />
              </SettingRow>
              <div style={{ marginTop: 18 }}>
                <button className="btn primary" onClick={() => toast('Cambios guardados')}>
                  Guardar cambios
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
                  {['testeCF', 'certeCF', 'eCF'].map((a) => (
                    <button key={a} className={a === 'eCF' ? 'on' : ''}>{a}</button>
                  ))}
                </div>
              </SettingRow>
              <SettingRow label="URL recepción e-CF">
                <input className="cfg-inp mono" defaultValue="https://ecf.dgii.gov.do/fe/recepcion/api/ecf" />
              </SettingRow>
              <SettingRow label="URL consulta de estado">
                <input className="cfg-inp mono" defaultValue="https://ecf.dgii.gov.do/fe/consultaestado" />
              </SettingRow>
              <SettingRow label="URL autenticación (semilla)">
                <input className="cfg-inp mono" defaultValue="https://ecf.dgii.gov.do/fe/autenticacion/api/semilla" />
              </SettingRow>
              <SettingRow label="Timeout de recepción" hint="Antes de activar contingencia">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input className="cfg-inp mono" style={{ width: 80 }} defaultValue="30" />
                  <span className="muted">segundos</span>
                </div>
              </SettingRow>
              <div style={{ marginTop: 18 }}>
                <button className="btn primary" onClick={() => toast('Configuración DGII guardada')}>
                  Guardar
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
                  defaultValue={"https://app.villarja.com\nhttps://*.cliente.com.do"}
                />
              </SettingRow>
              <ToggleRow label="Forzar HTTPS" hint="Rechazar peticiones no cifradas" defaultOn={true} />
              <ToggleRow label="Rate limiting por API Key" hint="Máx. 120 req/min por cliente" defaultOn={true} />
              <ToggleRow label="Autenticación de 2 factores (admin)" hint="Requerida al iniciar sesión" defaultOn={true} />
              <ToggleRow label="Rotación automática de llaves" hint="Cada 90 días" defaultOn={false} />
              <div style={{ marginTop: 18 }}>
                <button className="btn primary" onClick={() => toast('Ajustes de seguridad guardados')}>
                  Guardar
                </button>
              </div>
            </div>
          )}

          {tab === 'auditoria' && (
            <div className="table-wrap" style={{ margin: '-20px', marginTop: -8 }}>
              {auditLog.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
                  Cargando…
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
