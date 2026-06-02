/* Villar JA — Planes y Facturación + Configuración */
const { useState: uaS } = React;

function Planes({ toast }) {
  const planes = [
    { nombre: 'Básico', precio: 2500, color: 'var(--text-2)', desc: 'Para emisores de bajo volumen', clientes: 64, popular: false,
      feats: ['500 e-CF / mes', 'Tipos 31, 32, 34', '1 empresa (RNC)', 'Soporte por correo', 'Ambiente testeCF + eCF'] },
    { nombre: 'Pro', precio: 8900, color: 'var(--info)', desc: 'El más elegido por las PYMEs', clientes: 118, popular: true,
      feats: ['5,000 e-CF / mes', 'Tipos 31–34, 41, 43', 'Hasta 3 empresas', 'Soporte prioritario', 'Webhooks + reportes', 'Contingencia automática'] },
    { nombre: 'Enterprise', precio: 29500, color: 'var(--brand)', desc: 'Alto volumen y multi-empresa', clientes: 36, popular: false,
      feats: ['50,000 e-CF / mes', 'Todos los tipos e-CF', 'Hasta 25 empresas', 'SLA 99.9% + soporte 24/7', 'Gerente de cuenta', 'Integración dedicada'] },
  ];
  const ingresoTotal = window.CLIENTES.reduce((s, c) => s + (c.estado === 'Activo' ? c.ingresoMes : 0), 0);

  return (
    <div className="content-wrap fade-in">
      <div className="page-head">
        <div><h1>Planes y Facturación</h1><p>Suscripciones, límites e ingresos recurrentes</p></div>
        <div className="page-head-actions"><button className="btn primary" onClick={() => toast('Editor de planes')}><Icon name="plus" />Nuevo Plan</button></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 18 }}>
        <KPI icon="dollar" iconBg="var(--ok-bg)" iconColor="var(--ok)" label="MRR (ingreso recurrente)" value={'$' + window.fmtNum(1842500)} unit="DOP" delta="+8.1%" deltaNote="vs. mayo" up />
        <KPI icon="clientes" iconBg="var(--info-bg)" iconColor="var(--info)" label="Suscripciones activas" value="218" delta="+6" up />
        <KPI icon="trending" iconBg="var(--brand-soft)" iconColor="var(--brand)" label="Ticket promedio" value={'$' + window.fmtNum(8452)} unit="DOP" delta="+2.4%" up />
      </div>

      {/* Plan cards */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 18 }}>
        {planes.map(p => (
          <div className="card card-pad" key={p.nombre} style={{ position: 'relative', borderColor: p.popular ? 'var(--brand)' : 'var(--border)', boxShadow: p.popular ? '0 8px 28px -12px rgba(166,0,5,0.4)' : 'var(--shadow-sm)' }}>
            {p.popular && <span className="badge brand" style={{ position: 'absolute', top: -11, left: 20 }}>Más popular</span>}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 750, color: p.color }}>{p.nombre}</span>
              <span className="badge plain">{p.clientes} clientes</span>
            </div>
            <p className="muted" style={{ fontSize: 12.5, margin: '0 0 14px' }}>{p.desc}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 16 }}>
              <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1px' }}>${window.fmtNum(p.precio)}</span>
              <span className="muted" style={{ fontSize: 13 }}>DOP / mes</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
              {p.feats.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: 'var(--text-2)' }}>
                  <span style={{ width: 17, height: 17, borderRadius: '50%', background: p.popular ? 'var(--brand-soft)' : 'var(--ok-bg)', color: p.popular ? 'var(--brand)' : 'var(--ok)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="check" style={{ width: 11, height: 11 }} /></span>
                  {f}
                </div>
              ))}
            </div>
            <button className={"btn " + (p.popular ? 'primary' : '')} style={{ width: '100%' }} onClick={() => toast('Editar plan ' + p.nombre)}>Editar plan</button>
          </div>
        ))}
      </div>

      {/* Ingresos por cliente */}
      <div className="card">
        <div className="card-head"><div><h3>Ingresos por cliente</h3><p>Facturación mensual recurrente — top cuentas</p></div><span className="muted" style={{ fontSize: 12.5 }}>Total: ${window.fmtNum(ingresoTotal)} DOP/mes</span></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Cliente</th><th>Plan</th><th className="num">e-CF / mes</th><th className="num">Cuota mensual</th><th>Estado pago</th></tr></thead>
            <tbody>
              {[...window.CLIENTES].filter(c => c.estado !== 'Pendiente').sort((a, b) => b.ingresoMes - a.ingresoMes).slice(0, 8).map(c => (
                <tr key={c.id}>
                  <td><div className="cell-co"><CoMark cliente={c} size={28} /><b style={{ fontSize: 12.5 }}>{c.razon}</b></div></td>
                  <td><PlanPill plan={c.plan} /></td>
                  <td className="num">{window.fmtNum(c.facturasMes)}</td>
                  <td className="num strong">${window.fmtNum(c.ingresoMes)} DOP</td>
                  <td><Badge cls={c.estado === 'Suspendido' ? 'err' : 'ok'}>{c.estado === 'Suspendido' ? 'Suspendido' : 'Al día'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
window.Planes = Planes;

/* ============ Configuración ============ */
function Configuracion({ toast, dark }) {
  const [tab, setTab] = uaS('cuenta');
  const tabs = [['cuenta', 'Cuenta'], ['dgii', 'Ambiente DGII'], ['seguridad', 'CORS y Seguridad'], ['auditoria', 'Auditoría']];

  return (
    <div className="content-wrap fade-in">
      <div className="page-head"><div><h1>Configuración</h1><p>Ajustes de la cuenta y la plataforma e-CF</p></div></div>

      <div className="card">
        <div className="tabs" style={{ padding: '0 8px' }}>
          {tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
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
              <div style={{ marginTop: 18 }}><button className="btn primary" onClick={() => toast('Cambios guardados')}>Guardar cambios</button></div>
            </div>
          )}

          {tab === 'dgii' && (
            <div style={{ maxWidth: 620 }}>
              <div className="note info" style={{ marginBottom: 18 }}><Icon name="globe" /><div>Las URLs apuntan a los servicios oficiales de la DGII según el ambiente seleccionado. Cambiar el ambiente afecta a todos los clientes en ese entorno.</div></div>
              <SettingRow label="Ambiente activo" hint="Entorno por defecto para nuevos clientes">
                <div className="seg">
                  {['testeCF', 'certeCF', 'eCF'].map(a => <button key={a} className={a === 'eCF' ? 'on' : ''}>{a}</button>)}
                </div>
              </SettingRow>
              <SettingRow label="URL recepción e-CF"><input className="cfg-inp mono" defaultValue="https://ecf.dgii.gov.do/fe/recepcion/api/ecf" /></SettingRow>
              <SettingRow label="URL consulta de estado"><input className="cfg-inp mono" defaultValue="https://ecf.dgii.gov.do/fe/consultaestado" /></SettingRow>
              <SettingRow label="URL autenticación (semilla)"><input className="cfg-inp mono" defaultValue="https://ecf.dgii.gov.do/fe/autenticacion/api/semilla" /></SettingRow>
              <SettingRow label="Timeout de recepción" hint="Antes de activar contingencia">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input className="cfg-inp mono" style={{ width: 80 }} defaultValue="30" /><span className="muted">segundos</span></div>
              </SettingRow>
              <div style={{ marginTop: 18 }}><button className="btn primary" onClick={() => toast('Configuración DGII guardada')}>Guardar</button></div>
            </div>
          )}

          {tab === 'seguridad' && (
            <div style={{ maxWidth: 620 }}>
              <SettingRow label="Orígenes CORS permitidos" hint="Dominios autorizados para consumir la API">
                <textarea className="cfg-inp" rows="3" style={{ resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5 }} defaultValue={"https://app.villarja.com\nhttps://*.cliente.com.do"} />
              </SettingRow>
              <ToggleRow label="Forzar HTTPS" hint="Rechazar peticiones no cifradas" on={true} />
              <ToggleRow label="Rate limiting por API Key" hint="Máx. 120 req/min por cliente" on={true} />
              <ToggleRow label="Autenticación de 2 factores (admin)" hint="Requerida al iniciar sesión" on={true} />
              <ToggleRow label="Rotación automática de llaves" hint="Cada 90 días" on={false} />
              <div style={{ marginTop: 18 }}><button className="btn primary" onClick={() => toast('Ajustes de seguridad guardados')}>Guardar</button></div>
            </div>
          )}

          {tab === 'auditoria' && (
            <div className="table-wrap" style={{ margin: '-20px', marginTop: -8 }}>
              <table className="tbl">
                <thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Objeto</th><th>IP</th></tr></thead>
                <tbody>
                  {window.AUDIT_LOG.map((a, i) => (
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
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
window.Configuracion = Configuracion;

function SettingRow({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ paddingTop: 6 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0, minWidth: 240, display: 'flex', justifyContent: 'flex-end' }}>{children}</div>
    </div>
  );
}

function ToggleRow({ label, hint, on }) {
  const [v, setV] = uaS(on);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{hint}</div>}
      </div>
      <button onClick={() => setV(!v)} style={{ width: 42, height: 24, borderRadius: 14, border: 'none', background: v ? 'var(--brand)' : 'var(--border-strong)', position: 'relative', flexShrink: 0, transition: 'background .15s' }}>
        <span style={{ position: 'absolute', top: 3, left: v ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
      </button>
    </div>
  );
}
