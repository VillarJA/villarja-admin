/* Villar JA — Gestión de Clientes (lista) + Detalle de Cliente */
const { useState: ucS, useMemo: ucM } = React;

function Clientes({ go, toast }) {
  const [q, setQ] = ucS('');
  const [plan, setPlan] = ucS('Todos');
  const [estado, setEstado] = ucS('Todos');
  const [page, setPage] = ucS(1);
  const pageSize = 8;

  const filtered = ucM(() => {
    return window.CLIENTES.filter(c => {
      if (plan !== 'Todos' && c.plan !== plan) return false;
      if (estado !== 'Todos' && c.estado !== estado) return false;
      if (q && !(c.razon.toLowerCase().includes(q.toLowerCase()) || c.rnc.includes(q) || c.alias.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [q, plan, estado]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  React.useEffect(() => { setPage(1); }, [q, plan, estado]);

  return (
    <div className="content-wrap fade-in">
      <div className="page-head">
        <div><h1>Clientes</h1><p>{window.CLIENTES.length} empresas registradas · {window.CLIENTES.filter(c => c.estado === 'Activo').length} activas</p></div>
        <div className="page-head-actions">
          <button className="btn"><Icon name="download" />Exportar CSV</button>
          <button className="btn primary" onClick={() => toast('Formulario de nuevo cliente abierto')}><Icon name="plus" />Nuevo Cliente</button>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search-inline">
            <Icon name="search" />
            <input placeholder="Buscar por RNC, razón social o alias…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={plan} onChange={setPlan} options={['Todos', 'Básico', 'Pro', 'Enterprise']} />
          <Select value={estado} onChange={setEstado} options={['Todos', 'Activo', 'Suspendido', 'Pendiente']} />
          <div style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: 12.5 }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Empresa</th><th>RNC</th><th>Plan</th><th>Ambiente</th>
                <th className="num">Facturas/mes</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(c => (
                <tr key={c.id} className="clickable" onClick={() => go('cliente', c.id)}>
                  <td>
                    <div className="cell-co">
                      <CoMark cliente={c} />
                      <div className="cell-main"><b>{c.razon}</b><span className="mono">{c.alias}</span></div>
                    </div>
                  </td>
                  <td className="mono">{c.rnc}</td>
                  <td><PlanPill plan={c.plan} /></td>
                  <td><span className="tag-type">{c.amb}</span></td>
                  <td className="num">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span className="strong">{window.fmtNum(c.facturasMes)}</span>
                      <div className="meter" style={{ width: 80 }}><i style={{ width: Math.min(100, c.facturasMes / c.limite * 100) + '%' }} /></div>
                    </div>
                  </td>
                  <td><Badge cls={c.estado === 'Activo' ? 'ok' : c.estado === 'Suspendido' ? 'err' : 'warn'}>{c.estado}</Badge></td>
                  <td>
                    <div className="row-actions" onClick={e => e.stopPropagation()}>
                      <button className="ra" title="Ver detalle" onClick={() => go('cliente', c.id)}><Icon name="eye2" /></button>
                      <button className="ra" title="API Key" onClick={() => toast('API Key copiada')}><Icon name="key" /></button>
                      <button className="ra" title="Más"><Icon name="more" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} />
      </div>
    </div>
  );
}
window.Clientes = Clientes;

/* ============ Detalle de Cliente ============ */
function ClienteDetalle({ id, go, toast }) {
  const c = window.CLIENTES.find(x => x.id === id) || window.CLIENTES[0];
  const [tab, setTab] = ucS('secuencias');
  const [showKey, setShowKey] = ucS(false);
  const facturas = window.FACTURAS.filter(f => f.clienteId === c.id).slice(0, 6);
  const pl = window.PLAN_LIMITS[c.plan];
  const maskedKey = c.apiKey.slice(0, 12) + '••••••••••••••••';

  const certCls = c.cert === 'Vigente' ? 'ok' : c.cert === 'Por vencer' ? 'warn' : c.cert === 'Vencido' ? 'err' : 'draft';

  return (
    <div className="content-wrap fade-in">
      <div className="page-head">
        <div>
          <div className="breadcrumb" style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => go('clientes')}>
            <Icon name="chevleft" style={{ width: 14, height: 14 }} /> Volver a Clientes
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <CoMark cliente={c} size={46} />
            <div>
              <h1 style={{ marginBottom: 4 }}>{c.razon}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mono muted">RNC {c.rnc}</span>
                <PlanPill plan={c.plan} />
                <Badge cls={c.estado === 'Activo' ? 'ok' : c.estado === 'Suspendido' ? 'err' : 'warn'}>{c.estado}</Badge>
                <span className="tag-type">Ambiente: {c.amb}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={() => toast('Plan: selector abierto')}><Icon name="planes" />Cambiar Plan</button>
          <button className="btn danger" onClick={() => toast('Cliente suspendido')}><Icon name="power" />Suspender</button>
        </div>
      </div>

      {/* Top cards: API key + cert + plan */}
      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr 1fr', marginBottom: 18 }}>
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Icon name="key" style={{ width: 17, height: 17, color: 'var(--brand)' }} />
            <b style={{ fontSize: 13.5 }}>API Key (Producción)</b>
          </div>
          <div className="apikey-box">
            <code>{showKey ? c.apiKey : maskedKey}</code>
            <button className="kbtn" title={showKey ? 'Ocultar' : 'Mostrar'} onClick={() => setShowKey(!showKey)}><Icon name={showKey ? 'eyeoff' : 'eye'} /></button>
            <button className="kbtn" title="Copiar" onClick={() => toast('API Key copiada al portapapeles')}><Icon name="copy" /></button>
            <button className="kbtn" title="Regenerar" onClick={() => toast('API Key regenerada')}><Icon name="refresh" /></button>
          </div>
          <div className="note info" style={{ marginTop: 12 }}>
            <Icon name="shield" />
            <div>Regenerar la llave invalida la anterior de inmediato. Notifica al cliente antes de hacerlo.</div>
          </div>
        </div>

        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Icon name="cert" style={{ width: 17, height: 17, color: 'var(--brand)' }} />
            <b style={{ fontSize: 13.5 }}>Certificado .p12</b>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="muted" style={{ fontSize: 12.5 }}>Estado</span>
            <Badge cls={certCls}>{c.cert}</Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span className="muted" style={{ fontSize: 12.5 }}>Vencimiento</span>
            <span className="strong mono">{c.certVence}</span>
          </div>
          <button className="btn sm" style={{ width: '100%' }} onClick={() => toast(c.cert === 'Pendiente' ? 'Subir certificado' : 'Renovar certificado')}>
            <Icon name="file" />{c.cert === 'Pendiente' ? 'Subir certificado' : 'Renovar'}
          </button>
        </div>

        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Icon name="planes" style={{ width: 17, height: 17, color: 'var(--brand)' }} />
            <b style={{ fontSize: 13.5 }}>Plan {c.plan}</b>
          </div>
          <div className="stat-row" style={{ marginBottom: 4 }}>
            <b>{window.fmtNum(c.facturasMes)}</b><span>/ {window.fmtNum(pl.facturas)} e-CF</span>
          </div>
          <div className="meter" style={{ marginBottom: 12 }}><i style={{ width: Math.min(100, c.facturasMes / pl.facturas * 100) + '%' }} /></div>
          <div className="kv" style={{ gridTemplateColumns: '1fr auto', gap: '7px 10px', fontSize: 12.5 }}>
            <dt>Tipos e-CF</dt><dd style={{ textAlign: 'right' }}>{pl.tipos}</dd>
            <dt>Empresas</dt><dd style={{ textAlign: 'right' }}>{pl.empresas}</dd>
            <dt>Cuota mensual</dt><dd style={{ textAlign: 'right' }}>${window.fmtNum(pl.precio)} DOP</dd>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="tabs" style={{ padding: '0 8px' }}>
          <button className={tab === 'secuencias' ? 'on' : ''} onClick={() => setTab('secuencias')}>Secuencias e-NCF</button>
          <button className={tab === 'facturas' ? 'on' : ''} onClick={() => setTab('facturas')}>Últimas facturas</button>
        </div>

        {tab === 'secuencias' && (
          <div>
            <div className="toolbar" style={{ justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: 12.5 }}>5 secuencias autorizadas por la DGII</span>
              <button className="btn sm primary" onClick={() => toast('Crear secuencia e-NCF')}><Icon name="plus" />Crear Secuencia</button>
            </div>
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Tipo</th><th>Rango autorizado</th><th className="num">Usadas</th><th className="num">Disponibles</th><th>Consumo</th><th>Vence</th></tr></thead>
                <tbody>
                  {window.SECUENCIAS.map((s, i) => {
                    const disp = s.hasta - s.usadas;
                    const pct = s.usadas / s.hasta * 100;
                    const mc = pct > 90 ? 'err' : pct > 75 ? 'warn' : 'ok';
                    return (
                      <tr key={i}>
                        <td><span className="tag-type">{s.tipo}</span> <span className="strong" style={{ marginLeft: 6 }}>{s.desc}</span></td>
                        <td className="mono">{String(s.desde).padStart(8, '0')} – {String(s.hasta).padStart(8, '0')}</td>
                        <td className="num">{window.fmtNum(s.usadas)}</td>
                        <td className="num strong">{window.fmtNum(disp)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className={"meter " + mc} style={{ width: 90 }}><i style={{ width: pct + '%' }} /></div>
                            <span className="muted" style={{ fontSize: 11.5, width: 34 }}>{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="mono muted">{s.vence}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'facturas' && (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>eNCF</th><th>Tipo</th><th className="num">Monto</th><th className="num">ITBIS</th><th>Fecha</th><th>Estado</th></tr></thead>
              <tbody>
                {facturas.map(f => (
                  <tr key={f.id}>
                    <td className="mono">{f.encf}</td>
                    <td><span className="tag-type">{f.tipo}</span> {window.ECF_TYPES[f.tipo]}</td>
                    <td className="num strong">${window.fmtDOP(f.monto)}</td>
                    <td className="num muted">${window.fmtDOP(f.itbis)}</td>
                    <td className="muted">{window.fmtDateTime(f.fecha)}</td>
                    <td><EstadoBadge estado={f.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
window.ClienteDetalle = ClienteDetalle;
