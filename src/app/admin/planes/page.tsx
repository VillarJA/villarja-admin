'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/Icons';
import { KPICard } from '@/components/ui/KPICard';
import { Badge, PlanPill } from '@/components/ui/Badge';
import { CoMark } from '@/components/ui/CoMark';
import { useToast } from '@/components/ui/Toast';
import { fmtNum } from '@/lib/data';
import { getClientes, getPlanes } from '@/lib/data-layer';
import type { PlanStat } from '@/lib/data-layer';
import type { Company } from '@/types';

export default function PlanesPage() {
  const [clientes, setClientes] = useState<Company[]>([]);
  const [planes, setPlanes] = useState<PlanStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastNode, toast] = useToast();

  useEffect(() => {
    Promise.all([getClientes(), getPlanes()]).then(([cls, pls]) => {
      setClientes(cls);
      setPlanes(pls);
      setLoading(false);
    });
  }, []);

  const activosCount = clientes.filter((c) => c.estado === 'Activo').length;
  const ingresoTotal = clientes.reduce((s, c) => s + (c.estado === 'Activo' ? c.ingresoMes : 0), 0);
  const ticketPromedio = activosCount > 0 ? Math.round(ingresoTotal / activosCount) : 0;

  const topClientes = [...clientes]
    .filter((c) => c.estado !== 'Pendiente')
    .sort((a, b) => b.ingresoMes - a.ingresoMes)
    .slice(0, 8);

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
          <h1>Planes y Facturación</h1>
          <p>Suscripciones, límites e ingresos recurrentes</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 18 }}>
        <KPICard icon="dollar"   iconBg="var(--ok-bg)"     iconColor="var(--ok)"   label="MRR (ingreso recurrente)" value={'$' + fmtNum(ingresoTotal)} unit="DOP" />
        <KPICard icon="clientes" iconBg="var(--info-bg)"   iconColor="var(--info)" label="Suscripciones activas"    value={String(activosCount)} />
        <KPICard icon="trending" iconBg="var(--brand-soft)" iconColor="var(--brand)" label="Ticket promedio"        value={'$' + fmtNum(ticketPromedio)} unit="DOP" />
      </div>

      {/* Plan cards */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 18 }}>
        {planes.map((p) => (
          <div
            key={p.id}
            className="card card-pad"
            style={{
              position: 'relative',
              borderColor: p.popular ? 'var(--brand)' : 'var(--border)',
              boxShadow: p.popular ? '0 8px 28px -12px rgba(166,0,5,0.4)' : 'var(--shadow-sm)',
            }}
          >
            {p.popular && (
              <span className="badge brand" style={{ position: 'absolute', top: -11, left: 20 }}>
                Más popular
              </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 750, color: p.popular ? 'var(--brand)' : 'var(--info)' }}>{p.nombre}</span>
              <span className="badge plain">{p.clienteCount} cliente{p.clienteCount !== 1 ? 's' : ''}</span>
            </div>
            <p className="muted" style={{ fontSize: 12.5, margin: '0 0 14px' }}>{p.descripcion}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 16 }}>
              <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1px' }}>${fmtNum(p.precio)}</span>
              <span className="muted" style={{ fontSize: 13 }}>DOP / mes</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
              {p.features.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: 'var(--text-2)' }}>
                  <span style={{
                    width: 17, height: 17, borderRadius: '50%',
                    background: p.popular ? 'var(--brand-soft)' : 'var(--ok-bg)',
                    color: p.popular ? 'var(--brand)' : 'var(--ok)',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    <Icon name="check" style={{ width: 11, height: 11 }} />
                  </span>
                  {f}
                </div>
              ))}
            </div>
            <button
              className="btn"
              style={{ width: '100%', opacity: 0.55, cursor: 'not-allowed' }}
              disabled
              title="Edición de planes disponible próximamente"
            >
              Editar plan
              <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--surface-3)', padding: '2px 6px', borderRadius: 10, fontWeight: 700, color: 'var(--text-muted)' }}>Próximamente</span>
            </button>
          </div>
        ))}
      </div>

      {/* Ingresos table */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3>Ingresos por cliente</h3>
            <p>Facturación mensual recurrente — top cuentas</p>
          </div>
          <span className="muted" style={{ fontSize: 12.5 }}>
            Total: ${fmtNum(ingresoTotal)} DOP/mes
          </span>
        </div>
        {topClientes.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
            No hay clientes registrados
          </div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Cliente</th><th>Plan</th>
                  <th className="num">e-CF / mes</th><th className="num">Cuota mensual</th>
                  <th>Estado pago</th>
                </tr>
              </thead>
              <tbody>
                {topClientes.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="cell-co">
                        <CoMark cliente={c} size={28} />
                        <b style={{ fontSize: 12.5 }}>{c.razon}</b>
                      </div>
                    </td>
                    <td><PlanPill plan={c.plan} /></td>
                    <td className="num">{fmtNum(c.facturasMes)}</td>
                    <td className="num strong">${fmtNum(c.ingresoMes)} DOP</td>
                    <td>
                      <Badge cls={c.estado === 'Suspendido' ? 'err' : 'ok'}>
                        {c.estado === 'Suspendido' ? 'Suspendido' : 'Al día'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toastNode}
    </div>
  );
}
