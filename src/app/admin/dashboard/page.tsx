'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icons';
import { KPICard } from '@/components/ui/KPICard';
import { EstadoBadge } from '@/components/ui/Badge';
import { LineChart } from '@/components/charts/LineChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { SERIE_30D, DONUT_TIPOS, fmtNum, fmtDOP, fmtDate } from '@/lib/data';
import { getClientes, getFacturas, getDGIIServices } from '@/lib/data-layer';
import type { Company, Factura, DgiiService } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Company[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [dgiiServices, setDgiiServices] = useState<DgiiService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getClientes(), getFacturas(), getDGIIServices()]).then(([cls, facs, svcs]) => {
      setClientes(cls);
      setFacturas(facs);
      setDgiiServices(svcs);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="content-wrap">
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
          Cargando…
        </div>
      </div>
    );
  }

  const recientes = facturas.slice(0, 10);
  const totalMes = clientes.reduce((s, c) => s + c.facturasMes, 0);
  const clientesActivos = clientes.filter((c) => c.estado === 'Activo').length;
  const ingresosMes = clientes.reduce((s, c) => s + (c.estado !== 'Suspendido' ? c.ingresoMes : 0), 0);
  const rechazados = facturas.filter((f) => f.estado === 'rejected').length;
  const tasaRechazo = facturas.length > 0 ? ((rechazados / facturas.length) * 100).toFixed(1) + '%' : '0.0%';

  return (
    <div className="content-wrap fade-in">
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Resumen operativo · {fmtDate(new Date())}</p>
        </div>
        <div className="page-head-actions">
          <button className="btn"><Icon name="download" />Exportar</button>
          <button className="btn primary" onClick={() => router.push('/admin/clientes')}>
            <Icon name="plus" />Nuevo Cliente
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 18 }}>
        <KPICard icon="building" iconBg="var(--brand-soft)" iconColor="var(--brand)" label="Clientes activos" value={String(clientesActivos)} delta="+6" deltaNote="este mes" up />
        <KPICard icon="receipt" iconBg="var(--info-bg)" iconColor="var(--info)" label="Facturas hoy" value={fmtNum(facturas.length)} delta="+12.4%" deltaNote="vs. ayer" up />
        <KPICard icon="dollar" iconBg="var(--ok-bg)" iconColor="var(--ok)" label="Ingresos del mes" value={'$' + fmtNum(ingresosMes)} unit="DOP" delta="+8.1%" deltaNote="vs. mayo" up />
        <KPICard icon="trending" iconBg="var(--err-bg)" iconColor="var(--err)" label="Tasa rechazo DGII" value={tasaRechazo} delta="-0.3pp" deltaNote="mejoró" up />
      </div>

      {/* Charts */}
      <div className="grid" style={{ gridTemplateColumns: '1.55fr 1fr', marginBottom: 18 }}>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Facturas emitidas — últimos 30 días</h3>
              <p>{fmtNum(totalMes)} e-CF acumulados en el período</p>
            </div>
            <span className="badge ok"><i className="bdot" />+14.2%</span>
          </div>
          <div className="card-pad"><LineChart data={SERIE_30D} /></div>
        </div>
        <div className="card">
          <div className="card-head">
            <div><h3>Distribución por tipo e-CF</h3><p>Mes en curso</p></div>
          </div>
          <div className="card-pad"><DonutChart data={DONUT_TIPOS} /></div>
        </div>
      </div>

      {/* Table + DGII */}
      <div className="grid" style={{ gridTemplateColumns: '1.55fr 1fr' }}>
        <div className="card">
          <div className="card-head">
            <div><h3>Últimas facturas emitidas</h3></div>
            <button className="btn sm ghost" onClick={() => router.push('/admin/facturas')}>
              Ver todas <Icon name="chevright" style={{ width: 13, height: 13 }} />
            </button>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr><th>eNCF</th><th>Cliente</th><th className="num">Monto</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {recientes.map((f) => (
                  <tr key={f.id} className="clickable" onClick={() => router.push('/admin/facturas')}>
                    <td>
                      <span className="mono">{f.encf}</span>
                      <span className="tag-type" style={{ marginLeft: 8 }}>{f.tipo}</span>
                    </td>
                    <td className="strong">{f.cliente.length > 24 ? f.cliente.slice(0, 24) + '…' : f.cliente}</td>
                    <td className="num strong">${fmtDOP(f.total)}</td>
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
                {dgiiServices.map((s, i) => (
                  <div className="svc-item" key={i}>
                    <span
                      className="svc-dot"
                      style={{
                        background: s.estado === 'ok' ? 'var(--ok)' : 'var(--warn)',
                        boxShadow: `0 0 0 3px ${s.estado === 'ok' ? 'rgba(31,157,87,0.18)' : 'rgba(201,138,6,0.18)'}`,
                      }}
                    />
                    <span className="svc-name">
                      {s.name}
                      <small className="mono">{s.sub}</small>
                    </span>
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
            <div style={{ fontSize: 20, fontWeight: 750, letterSpacing: '-0.5px', marginBottom: 2 }} className="mono">
              ecf.villarja.com
            </div>
            <div style={{ fontSize: 12, color: '#9092a8' }}>API v2 · uptime 99.98% · 14ms p50</div>
          </div>
        </div>
      </div>
    </div>
  );
}
