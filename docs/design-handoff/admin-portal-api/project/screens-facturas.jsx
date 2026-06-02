/* Villar JA — Emisión de Facturas (global) + Contingencia */
const { useState: ufS, useMemo: ufM } = React;

function Facturas({ go, toast }) {
  const [q, setQ] = ufS('');
  const [tipo, setTipo] = ufS('Todos');
  const [estado, setEstado] = ufS('Todos');
  const [page, setPage] = ufS(1);
  const pageSize = 12;

  const filtered = ufM(() => window.FACTURAS.filter(f => {
    if (tipo !== 'Todos' && String(f.tipo) !== tipo) return false;
    if (estado !== 'Todos' && f.estado !== estado) return false;
    if (q && !(f.encf.toLowerCase().includes(q.toLowerCase()) || f.cliente.toLowerCase().includes(q.toLowerCase()) || f.rnc.includes(q))) return false;
    return true;
  }), [q, tipo, estado]);

  React.useEffect(() => { setPage(1); }, [q, tipo, estado]);
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const counts = {};
  window.FACTURAS.forEach(f => { counts[f.estado] = (counts[f.estado] || 0) + 1; });
  const chips = [
    { k: 'Todos', l: 'Todos', n: window.FACTURAS.length, cls: 'plain' },
    { k: 'accepted', l: 'Aceptados', n: counts.accepted, cls: 'ok' },
    { k: 'sent', l: 'Enviados', n: counts.sent, cls: 'info' },
    { k: 'pending', l: 'En proceso', n: counts.pending, cls: 'warn' },
    { k: 'rejected', l: 'Rechazados', n: counts.rejected, cls: 'err' },
    { k: 'contingency', l: 'Contingencia', n: counts.contingency, cls: 'cont' },
    { k: 'draft', l: 'Borradores', n: counts.draft, cls: 'draft' },
  ];

  return (
    <div className="content-wrap fade-in">
      <div className="page-head">
        <div><h1>Emisión de Facturas</h1><p>Todos los comprobantes e-CF emitidos en la plataforma</p></div>
        <div className="page-head-actions">
          <button className="btn"><Icon name="calendar" />Junio 2026</button>
          <button className="btn"><Icon name="download" />Exportar</button>
        </div>
      </div>

      {/* status chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {chips.map(ch => (
          <button key={ch.k} onClick={() => setEstado(ch.k)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', borderRadius: 10,
              border: '1px solid ' + (estado === ch.k ? 'var(--brand)' : 'var(--border)'),
              background: estado === ch.k ? 'var(--brand-soft)' : 'var(--surface)',
              color: estado === ch.k ? 'var(--brand)' : 'var(--text-2)', fontSize: 12.5, fontWeight: 600,
            }}>
            {ch.l}
            <span style={{ fontWeight: 700, fontSize: 11, padding: '1px 7px', borderRadius: 12, background: estado === ch.k ? 'var(--brand)' : 'var(--surface-3)', color: estado === ch.k ? '#fff' : 'var(--text-muted)' }}>{window.fmtNum(ch.n || 0)}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search-inline">
            <Icon name="search" />
            <input placeholder="Buscar eNCF, cliente o RNC…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select value={tipo} onChange={setTipo} options={[{ v: 'Todos', l: 'Todos los tipos' }, ...Object.keys(window.ECF_TYPES).map(t => ({ v: t, l: t + ' · ' + window.ECF_TYPES[t] }))]} />
          <div style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: 12.5 }}>{window.fmtNum(filtered.length)} comprobantes</span>
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>eNCF</th><th>Tipo</th><th>Cliente</th><th className="num">Monto</th><th className="num">ITBIS</th><th>Fecha</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
            </thead>
            <tbody>
              {rows.map(f => (
                <tr key={f.id}>
                  <td className="mono strong">{f.encf}</td>
                  <td><span className="tag-type">{f.tipo}</span></td>
                  <td>
                    <div className="cell-main"><b style={{ fontSize: 12.5 }}>{f.cliente.length > 22 ? f.cliente.slice(0, 22) + '…' : f.cliente}</b><span className="mono">{f.rnc}</span></div>
                  </td>
                  <td className="num strong">${window.fmtDOP(f.monto)}</td>
                  <td className="num muted">${window.fmtDOP(f.itbis)}</td>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{window.fmtDateTime(f.fecha)}</td>
                  <td><EstadoBadge estado={f.estado} /></td>
                  <td>
                    <div className="row-actions">
                      <button className="ra" title="Ver XML" onClick={() => toast('XML del e-CF ' + f.encf)}><Icon name="code" /></button>
                      <button className="ra" title="Ver PDF" onClick={() => toast('Representación impresa (PDF)')}><Icon name="file" /></button>
                      <button className="ra" title="Estado DGII" onClick={() => toast('Consultando estado en DGII…')}><Icon name="globe" /></button>
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
window.Facturas = Facturas;

/* ============ Contingencia ============ */
function Contingencia({ toast }) {
  const [activa, setActiva] = ufS(true);
  return (
    <div className="content-wrap fade-in">
      <div className="page-head">
        <div><h1>Contingencia</h1><p>Modo de respaldo ante indisponibilidad de los servicios DGII</p></div>
      </div>

      {/* Status banner */}
      <div className="card card-pad" style={{ marginBottom: 18, borderColor: activa ? 'var(--cont-bd)' : 'var(--ok-bd)', background: activa ? 'var(--cont-bg)' : 'var(--ok-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, display: 'grid', placeItems: 'center', background: activa ? 'var(--cont)' : 'var(--ok)', color: '#fff', flexShrink: 0 }}>
            <Icon name={activa ? 'contingencia' : 'checkcircle'} style={{ width: 24, height: 24 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 750, color: activa ? 'var(--cont)' : 'var(--ok)', marginBottom: 2 }}>
              {activa ? 'En contingencia' : 'Operación normal'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
              {activa ? 'DGII respondió 503 a las 12:33. Los e-CF se almacenan firmados y se reenvían automáticamente.' : 'Todos los servicios DGII operativos. Sin elementos en cola.'}
            </div>
          </div>
          <button className={"btn " + (activa ? 'primary' : '')} onClick={() => { setActiva(!activa); toast(activa ? 'Saliendo de contingencia…' : 'Contingencia activada manualmente'); }}>
            <Icon name="refresh" />{activa ? 'Forzar reenvío' : 'Activar manual'}
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 18 }}>
        <KPI icon="inbox" iconBg="var(--cont-bg)" iconColor="var(--cont)" label="En cola de reintento" value="18" />
        <KPI icon="refresh" iconBg="var(--info-bg)" iconColor="var(--info)" label="Reintentos / hora" value="124" />
        <KPI icon="checkcircle" iconBg="var(--ok-bg)" iconColor="var(--ok)" label="Reenviados hoy" value="296" />
        <KPI icon="clock" iconBg="var(--warn-bg)" iconColor="var(--warn)" label="Antigüedad máx." value="11" unit="min" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <div className="card">
          <div className="card-head"><div><h3>Cola de reintento</h3><p>Próximo intento automático en orden</p></div><span className="badge cont"><i className="bdot" />{window.CONTINGENCIA_QUEUE.length} pendientes</span></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>eNCF</th><th>Cliente</th><th>Motivo</th><th className="num">Intentos</th><th>Próximo</th></tr></thead>
              <tbody>
                {window.CONTINGENCIA_QUEUE.map((q, i) => (
                  <tr key={i}>
                    <td className="mono strong">{q.encf}</td>
                    <td>{q.cliente.length > 22 ? q.cliente.slice(0, 22) + '…' : q.cliente}</td>
                    <td><span className="muted" style={{ fontSize: 12 }}>{q.motivo}</span></td>
                    <td className="num"><Badge cls={q.intentos >= 4 ? 'err' : 'warn'}>{q.intentos}/5</Badge></td>
                    <td className="mono" style={{ color: 'var(--cont)', fontWeight: 600 }}>{q.proximo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div><h3>Historial de eventos</h3></div></div>
          <div className="card-pad" style={{ paddingTop: 6 }}>
            <div style={{ position: 'relative', paddingLeft: 4 }}>
              {window.CONTINGENCIA_HIST.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: i === window.CONTINGENCIA_HIST.length - 1 ? 0 : 18, position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ width: 11, height: 11, borderRadius: '50%', background: h.tipo === 'ok' ? 'var(--ok)' : 'var(--cont)', flexShrink: 0, marginTop: 3, zIndex: 1 }} />
                    {i !== window.CONTINGENCIA_HIST.length - 1 && <span style={{ width: 2, flex: 1, background: 'var(--border)', marginTop: 2 }} />}
                  </div>
                  <div style={{ paddingBottom: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--text)' }}>{h.evt}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 3px' }}>{h.det}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{h.ts}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.Contingencia = Contingencia;
