'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icons';
import { Badge, PlanPill } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { CoMark } from '@/components/ui/CoMark';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { fmtNum } from '@/lib/data';
import { getClientes } from '@/lib/data-layer';
import type { Company } from '@/types';

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [plan, setPlan] = useState('Todos');
  const [estado, setEstado] = useState('Todos');
  const [page, setPage] = useState(1);
  const [toastNode, toast] = useToast();
  const pageSize = 8;

  useEffect(() => {
    getClientes().then((data) => { setClientes(data); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    return clientes.filter((c) => {
      if (plan !== 'Todos' && c.plan !== plan) return false;
      if (estado !== 'Todos' && c.estado !== estado) return false;
      if (q && !(
        c.razon.toLowerCase().includes(q.toLowerCase()) ||
        c.rnc.includes(q) ||
        c.alias.toLowerCase().includes(q.toLowerCase())
      )) return false;
      return true;
    });
  }, [clientes, q, plan, estado]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleFilter = (setter: (v: string) => void) => (v: string) => {
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
          <h1>Clientes</h1>
          <p>{clientes.length} empresas registradas · {clientes.filter((c) => c.estado === 'Activo').length} activas</p>
        </div>
        <div className="page-head-actions">
          <button className="btn"><Icon name="download" />Exportar CSV</button>
          <button className="btn primary" onClick={() => toast('Formulario de nuevo cliente abierto')}>
            <Icon name="plus" />Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search-inline">
            <Icon name="search" />
            <input
              placeholder="Buscar por RNC, razón social o alias…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={plan} onChange={handleFilter(setPlan)} options={['Todos', 'Básico', 'Pro', 'Enterprise']} />
          <Select value={estado} onChange={handleFilter(setEstado)} options={['Todos', 'Activo', 'Suspendido', 'Pendiente']} />
          <div style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: 12.5 }}>
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Empresa</th><th>RNC</th><th>Plan</th><th>Ambiente</th>
                <th className="num">Facturas/mes</th><th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((c) => (
                <tr key={c.id} className="clickable" onClick={() => router.push(`/admin/clientes/${c.id}`)}>
                  <td>
                    <div className="cell-co">
                      <CoMark cliente={c} />
                      <div className="cell-main">
                        <b>{c.razon}</b>
                        <span className="mono">{c.alias}</span>
                      </div>
                    </div>
                  </td>
                  <td className="mono">{c.rnc}</td>
                  <td><PlanPill plan={c.plan} /></td>
                  <td><span className="tag-type">{c.amb}</span></td>
                  <td className="num">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span className="strong">{fmtNum(c.facturasMes)}</span>
                      <div className="meter" style={{ width: 80 }}>
                        <i style={{ width: Math.min(100, (c.facturasMes / c.limite) * 100) + '%' }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge cls={c.estado === 'Activo' ? 'ok' : c.estado === 'Suspendido' ? 'err' : 'warn'}>
                      {c.estado}
                    </Badge>
                  </td>
                  <td>
                    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="ra" title="Ver detalle" onClick={() => router.push(`/admin/clientes/${c.id}`)}>
                        <Icon name="eye2" />
                      </button>
                      <button className="ra" title="API Key" onClick={() => toast('API Key copiada')}>
                        <Icon name="key" />
                      </button>
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

      {toastNode}
    </div>
  );
}
