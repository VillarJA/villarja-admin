'use client';

import { useState, useMemo, useEffect } from 'react';
import { Icon } from '@/components/Icons';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { fmtDateTime } from '@/lib/data';
import { getRecepciones, exportCSV } from '@/lib/data-layer';
import type { Recepcion } from '@/types';

const TIPO_LABELS: Record<string, string> = {
  ecf:       'e-CF recibido',
  aprobacion: 'Aprobación comercial',
};

const TIPO_COLORS: Record<string, string> = {
  ecf:        'var(--brand)',
  aprobacion: 'var(--ok)',
};

export default function RecepcionesPage() {
  const [items, setItems]   = useState<Recepcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ]           = useState('');
  const [tipo, setTipo]     = useState('Todos');
  const [page, setPage]     = useState(1);
  const [toastNode, toast]  = useToast();
  const pageSize = 12;

  useEffect(() => {
    getRecepciones().then((data) => { setItems(data); setLoading(false); });
  }, []);

  const filtered = useMemo(() => items.filter((r) => {
    if (tipo !== 'Todos' && r.tipo !== tipo) return false;
    if (q && !(
      r.encf.toLowerCase().includes(q.toLowerCase()) ||
      r.rncEmisor.includes(q) ||
      r.rncComprador.includes(q) ||
      r.razonSocial.toLowerCase().includes(q.toLowerCase())
    )) return false;
    return true;
  }), [items, q, tipo]);

  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const countECF       = items.filter((r) => r.tipo === 'ecf').length;
  const countAprobacion = items.filter((r) => r.tipo === 'aprobacion').length;
  const countPendiente  = items.filter((r) => !r.procesado).length;

  const chips = [
    { k: 'Todos',      l: 'Todos',                n: items.length,    color: 'var(--text-2)' },
    { k: 'ecf',        l: 'e-CF recibidos',        n: countECF,        color: 'var(--brand)' },
    { k: 'aprobacion', l: 'Aprobaciones comerciales', n: countAprobacion, color: 'var(--ok)' },
  ];

  const tipoOptions = [
    { v: 'Todos',      l: 'Todos los tipos' },
    { v: 'ecf',        l: 'e-CF recibido' },
    { v: 'aprobacion', l: 'Aprobación comercial' },
  ];

  const handleExportCSV = () => {
    const csvRows = filtered.map((r) => ({
      eNCF:         r.encf,
      Tipo:         TIPO_LABELS[r.tipo] ?? r.tipo,
      'RNC Emisor': r.rncEmisor,
      'RNC Comprador': r.rncComprador,
      Cliente:      r.razonSocial,
      Procesado:    r.procesado ? 'Sí' : 'No',
      Fecha:        r.fecha instanceof Date ? r.fecha.toISOString() : String(r.fecha),
    }));
    exportCSV(csvRows as unknown as Record<string, unknown>[], `recepciones_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleVerXml = async (r: Recepcion) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('vja_admin_token') : null;
    try {
      const res = await fetch(`/api/admin/recepciones/${r.id}/xml`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      const w = window.open('', '_blank');
      if (w) { w.document.write('<pre>' + xml.replace(/</g, '&lt;') + '</pre>'); }
    } catch {
      toast('XML no disponible en este momento');
    }
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
          <h1>Recepciones</h1>
          <p>e-CFs y aprobaciones comerciales recibidas vía protocolo Emisor-Receptor</p>
        </div>
        <div className="page-head-actions">
          {countPendiente > 0 && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8,
              background: 'var(--warn-soft)', color: 'var(--warn)',
              fontSize: 12.5, fontWeight: 600,
            }}>
              <Icon name="clock" style={{ width: 14, height: 14 }} />
              {countPendiente} pendientes
            </span>
          )}
          <button className="btn" onClick={handleExportCSV}>
            <Icon name="download" />Exportar CSV
          </button>
        </div>
      </div>

      {/* Chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {chips.map((ch) => (
          <button
            key={ch.k}
            onClick={() => { setTipo(ch.k); setPage(1); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 13px', borderRadius: 10,
              border: `1px solid ${tipo === ch.k ? 'var(--brand)' : 'var(--border)'}`,
              background: tipo === ch.k ? 'var(--brand-soft)' : 'var(--surface)',
              color: tipo === ch.k ? 'var(--brand)' : 'var(--text-2)',
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {ch.l}
            <span style={{
              fontWeight: 700, fontSize: 11, padding: '1px 7px', borderRadius: 12,
              background: tipo === ch.k ? 'var(--brand)' : 'var(--surface-3)',
              color: tipo === ch.k ? '#fff' : 'var(--text-muted)',
            }}>
              {ch.n ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search-inline">
            <Icon name="search" />
            <input
              placeholder="Buscar eNCF, RNC o cliente…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          <Select
            value={tipo}
            onChange={(v) => { setTipo(v); setPage(1); }}
            options={tipoOptions}
          />
          <div style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: 12.5 }}>
            {filtered.length} registros
          </span>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            {items.length === 0
              ? 'No se han recibido e-CFs ni aprobaciones comerciales aún'
              : 'Sin resultados para los filtros aplicados'}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>eNCF</th>
                  <th>Tipo</th>
                  <th>RNC Emisor</th>
                  <th>Cliente (receptor)</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>XML</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="mono strong">{r.encf}</td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                        fontSize: 11.5, fontWeight: 600,
                        background: `color-mix(in srgb, ${TIPO_COLORS[r.tipo] ?? 'var(--brand)'} 12%, transparent)`,
                        color: TIPO_COLORS[r.tipo] ?? 'var(--brand)',
                      }}>
                        {TIPO_LABELS[r.tipo] ?? r.tipo}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: 12.5 }}>{r.rncEmisor}</td>
                    <td>
                      <div className="cell-main">
                        <b style={{ fontSize: 12.5 }}>
                          {r.razonSocial.length > 24 ? r.razonSocial.slice(0, 24) + '…' : r.razonSocial}
                        </b>
                        <span className="mono">{r.rncComprador}</span>
                      </div>
                    </td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(r.fecha)}</td>
                    <td>
                      {r.procesado
                        ? <span style={{ color: 'var(--ok)', fontWeight: 600, fontSize: 12 }}>Procesado</span>
                        : <span style={{ color: 'var(--warn)', fontWeight: 600, fontSize: 12 }}>Pendiente</span>}
                    </td>
                    <td>
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="ra" title="Ver XML" onClick={() => handleVerXml(r)}>
                          <Icon name="code" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} />
      </div>

      {toastNode}
    </div>
  );
}
