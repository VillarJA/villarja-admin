/* Villar JA — Login + Dashboard */
const { useState: uS, useEffect: uE } = React;

function Login({ onLogin }) {
  const [email, setEmail] = uS('admin@villarja.com');
  const [pw, setPw] = uS('••••••••••');
  const [show, setShow] = uS(false);
  const [remember, setRemember] = uS(true);
  const [loading, setLoading] = uS(false);

  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 700);
  };

  return (
    <div className="login-stage">
      <div className="login-aside">
        <div className="la-grid" />
        <div className="la-top">
          <LogoMark size={44} />
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>Villar JA</div>
            <div style={{ color: '#9092a8', fontSize: 11.5 }}>Data y Tecnología</div>
          </div>
        </div>
        <div className="la-mid">
          <h2>Plataforma de Facturación Electrónica e-CF</h2>
          <p>Panel de administración para emisión de comprobantes fiscales electrónicos ante la DGII. Gestiona clientes, secuencias e-NCF, certificados y contingencia desde un solo lugar.</p>
        </div>
        <div className="la-foot">
          <div className="la-stat"><b>1.2M</b><span>e-CF emitidos / mes</span></div>
          <div className="la-stat"><b>99.4%</b><span>tasa de aceptación</span></div>
          <div className="la-stat"><b>240+</b><span>empresas activas</span></div>
        </div>
      </div>

      <div className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
            <LogoFull />
          </div>
          <h1>Iniciar sesión</h1>
          <p className="lc-sub">Accede al portal de administración e-CF</p>

          <div className="field">
            <label>Correo electrónico</label>
            <div className="inp-wrap">
              <Icon name="mail" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@empresa.com" />
            </div>
          </div>
          <div className="field">
            <label>Contraseña</label>
            <div className="inp-wrap">
              <Icon name="lock" />
              <input type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" />
              <button type="button" className="eye" onClick={() => setShow(!show)}><Icon name={show ? 'eyeoff' : 'eye'} /></button>
            </div>
          </div>
          <div className="login-row">
            <label onClick={(e) => { e.preventDefault(); setRemember(!remember); }}>
              <span className={"checkbox " + (remember ? 'on' : '')}>{remember && <Icon name="check" />}</span>
              Recordarme
            </label>
            <a href="#">¿Olvidaste tu contraseña?</a>
          </div>
          <button className="btn primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Verificando…' : 'Entrar al portal'}
          </button>
          <div className="login-foot">
            Protegido con autenticación de 2 factores · <span className="mono">ecf.villarja.com</span>
          </div>
        </form>
      </div>
    </div>
  );
}
window.Login = Login;

/* ============ Dashboard ============ */
function Dashboard({ go, toast }) {
  const recientes = window.FACTURAS.slice(0, 10);
  const totalMes = window.CLIENTES.reduce((s, c) => s + c.facturasMes, 0);
  const ingresos = window.CLIENTES.filter(c => c.estado === 'Activo').reduce((s, c) => s + c.ingresoMes, 0);

  return (
    <div className="content-wrap fade-in">
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Resumen operativo · {window.fmtDate(new Date('2026-06-01'))}</p>
        </div>
        <div className="page-head-actions">
          <button className="btn"><Icon name="download" />Exportar</button>
          <button className="btn primary" onClick={() => go('clientes')}><Icon name="plus" />Nuevo Cliente</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 18 }}>
        <KPI icon="building" iconBg="var(--brand-soft)" iconColor="var(--brand)" label="Clientes activos" value="218" delta="+6" deltaNote="este mes" up />
        <KPI icon="receipt" iconBg="var(--info-bg)" iconColor="var(--info)" label="Facturas hoy" value="4,182" delta="+12.4%" deltaNote="vs. ayer" up />
        <KPI icon="dollar" iconBg="var(--ok-bg)" iconColor="var(--ok)" label="Ingresos del mes" value={'$' + window.fmtNum(1842500)} unit="DOP" delta="+8.1%" deltaNote="vs. mayo" up />
        <KPI icon="trending" iconBg="var(--err-bg)" iconColor="var(--err)" label="Tasa rechazo DGII" value="0.9%" delta="-0.3pp" deltaNote="mejoró" up />
      </div>

      {/* Charts row */}
      <div className="grid" style={{ gridTemplateColumns: '1.55fr 1fr', marginBottom: 18 }}>
        <div className="card">
          <div className="card-head">
            <div><h3>Facturas emitidas — últimos 30 días</h3><p>{window.fmtNum(totalMes)} e-CF acumulados en el período</p></div>
            <span className="badge ok"><i className="bdot" />+14.2%</span>
          </div>
          <div className="card-pad"><LineChart data={window.SERIE_30D} /></div>
        </div>
        <div className="card">
          <div className="card-head"><div><h3>Distribución por tipo e-CF</h3><p>Mes en curso</p></div></div>
          <div className="card-pad"><Donut data={window.DONUT_TIPOS} /></div>
        </div>
      </div>

      {/* Table + DGII status */}
      <div className="grid" style={{ gridTemplateColumns: '1.55fr 1fr' }}>
        <div className="card">
          <div className="card-head">
            <div><h3>Últimas facturas emitidas</h3></div>
            <button className="btn sm ghost" onClick={() => go('facturas')}>Ver todas<Icon name="chevright" style={{ width: 13, height: 13 }} /></button>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>eNCF</th><th>Cliente</th><th className="num">Monto</th><th>Estado</th></tr></thead>
              <tbody>
                {recientes.map(f => (
                  <tr key={f.id} className="clickable" onClick={() => go('facturas')}>
                    <td><span className="mono">{f.encf}</span><span className="tag-type" style={{ marginLeft: 8 }}>{f.tipo}</span></td>
                    <td className="strong">{f.cliente.length > 24 ? f.cliente.slice(0, 24) + '…' : f.cliente}</td>
                    <td className="num strong">${window.fmtDOP(f.total)}</td>
                    <td><EstadoBadge estado={f.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card">
            <div className="card-head">
              <div><h3>Estado servicios DGII</h3></div>
              <span className="badge ok"><i className="bdot" />Operativo</span>
            </div>
            <div className="card-pad" style={{ paddingTop: 4, paddingBottom: 8 }}>
              <div className="svc-list">
                {window.DGII_SERVICES.map((s, i) => (
                  <div className="svc-item" key={i}>
                    <span className="svc-dot" style={{ background: s.estado === 'ok' ? 'var(--ok)' : 'var(--warn)', boxShadow: `0 0 0 3px ${s.estado === 'ok' ? 'rgba(31,157,87,0.18)' : 'rgba(201,138,6,0.18)'}` }} />
                    <span className="svc-name">{s.name}<small className="mono">{s.sub}</small></span>
                    <span className="svc-lat">{s.lat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="card card-pad" style={{ background: 'var(--navy)', color: '#fff', borderColor: 'transparent' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12.5, color: '#9092a8', fontWeight: 600 }}>AMBIENTE DE PRODUCCIÓN</span>
              <span className="badge ok" style={{ background: 'rgba(31,157,87,0.18)' }}><i className="bdot" />eCF</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 750, letterSpacing: '-0.5px', marginBottom: 2 }} className="mono">ecf.villarja.com</div>
            <div style={{ fontSize: 12, color: '#9092a8' }}>API v2 · uptime 99.98% · 14ms p50</div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.Dashboard = Dashboard;
