'use client';

import { useState, useMemo, useEffect } from 'react';
import { Icon } from '@/components/Icons';
import { EstadoBadge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { ECF_TYPES, fmtNum, fmtDOP, fmtDateTime } from '@/lib/data';
import { getFacturas } from '@/lib/data-layer';
import type { Factura } from '@/types';

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('Todos');
  const [estado, setEstado] = useState('Todos');
  const [page, setPage] = useState(1);
  const [toastNode, toast] = useToast();
  const pageSize = 12;

  useEffect(() => {
    getFacturas().then((data) => { setFacturas(data); setLoading(false); });
  }, []);

  const filtered = useMemo(() => facturas.filter((f) => {
    if (tipo !== 'Todos' && String(f.tipo) !== tipo) return false;
    if (estado !== 'Todos' && f.estado !== estado) return false;
    if (q && !(
      f.encf.toLowerCase().includes(q.toLowerCase()) ||
      f.cliente.toLowerCase().includes(q.toLowerCase()) ||
      f.rnc.includes(q)
    )) return false;
    return true;
  }), [facturas, q, tipo, estado]);

  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const counts: Record<string, number> = {};
  facturas.forEach((f) => { counts[f.estado] = (counts[f.estado] || 0) + 1; });

  const chips = [
    { k: 'Todos',       l: 'Todos',        n: facturas.length, cls: 'plain' },
    { k: 'accepted',    l: 'Aceptados',     n: counts.accepted,    cls: 'ok' },
    { k: 'sent',        l: 'Enviados',      n: counts.sent,        cls: 'info' },
    { k: 'pending',     l: 'En proceso',    n: counts.pending,     cls: 'warn' },
    { k: 'rejected',    l: 'Rechazados',    n: counts.rejected,    cls: 'err' },
    { k: 'contingency', l: 'Contingencia',  n: counts.contingency, cls: 'cont' },
    { k: 'draft',       l: 'Borradores',    n: counts.draft,       cls: 'draft' },
  ];

  const tipoOptions = [
    { v: 'Todos', l: 'Todos los tipos' },
    ...Object.entries(ECF_TYPES).map(([t, l]) => ({ v: t, l: `${t} · ${l}` })),
  ];

  const setFiltered = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  if (loading) {
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
          <h1>Emisión de Facturas</h1>
          <p>Todos los comprobantes e-CF emitidos en la plataforma</p>
        </div>
        <div className="page-head-actions">
          <button className="btn"><Icon name="calendar" />Junio 2026</button>
          <button className="btn"><Icon name="download" />Exportar</button>
        </div>
      </div>

      {/* Status chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {chips.map((ch) => (
          <button
            key={ch.k}
            onClick={() => { setEstado(ch.k); setPage(1); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 13px', borderRadius: 10,
              border: `1px solid ${estado === ch.k ? 'var(--brand)' : 'var(--border)'}`,
              background: estado === ch.k ? 'var(--brand-soft)' : 'var(--surface)',
              color: estado === ch.k ? 'var(--brand)' : 'var(--text-2)',
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {ch.l}
            <span style={{
              fontWeight: 700, fontSize: 11, padding: '1px 7px', borderRadius: 12,
              background: estado === ch.k ? 'var(--brand)' : 'var(--surface-3)',
              color: estado === ch.k ? '#fff' : 'var(--text-muted)',
            }}>
              {fmtNum(ch.n || 0)}
            </span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search-inline">
            <Icon name="search" />
            <input
              placeholder="Buscar eNCF, cliente o RNC…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={tipo} onChange={setFiltered(setTipo)} options={tipoOptions} />
          <div style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: 12.5 }}>
            {fmtNum(filtered.length)} comprobantes
          </span>
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>eNCF</th><th>Tipo</th><th>Cliente</th>
                <th className="num">Monto</th><th className="num">ITBIS</th>
                <th>Fecha</th><th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id}>
                  <td className="mono strong">{f.encf}</td>
                  <td><span className="tag-type">{f.tipo}</span></td>
                  <td>
                    <div className="cell-main">
                      <b style={{ fontSize: 12.5 }}>
                        {f.cliente.length > 22 ? f.cliente.slice(0, 22) + '…' : f.cliente}
                      </b>
                      <span className="mono">{f.rnc}</span>
                    </div>
                  </td>
                  <td className="num strong">${fmtDOP(f.monto)}</td>
                  <td className="num muted">${fmtDOP(f.itbis)}</td>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(f.fecha)}</td>
                  <td><EstadoBadge estado={f.estado} /></td>
                  <td>
                    <div className="row-actions">
                      <button className="ra" title="Ver XML" onClick={() => toast('XML del e-CF ' + f.encf)}>
                        <Icon name="code" />
                      </button>
                      <button className="ra" title="Ver PDF" onClick={() => toast('Representación impresa (PDF)')}>
                        <Icon name="file" />
                      </button>
                      <button className="ra" title="Estado DGII" onClick={() => toast('Consultando estado en DGII…')}>
                        <Icon name="globe" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} />
      </div>

      {toastNode}
    </div>
  );
}
