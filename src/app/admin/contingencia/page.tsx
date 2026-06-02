'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/Icons';
import { Badge } from '@/components/ui/Badge';
import { KPICard } from '@/components/ui/KPICard';
import { useToast } from '@/components/ui/Toast';
import { getContingenciaQueue, getContingenciaHist } from '@/lib/data-layer';
import type { ContingenciaItem, ContingenciaHist } from '@/types';

export default function ContingenciaPage() {
  const [queue, setQueue] = useState<ContingenciaItem[]>([]);
  const [hist, setHist] = useState<ContingenciaHist[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastNode, toast] = useToast();

  useEffect(() => {
    Promise.all([getContingenciaQueue(), getContingenciaHist()]).then(([q, h]) => {
      setQueue(q);
      setHist(h);
      setLoading(false);
    });
  }, []);

  const activa = queue.length > 0;

  const handleForzarReenvio = async () => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://ecf.villarja.com';
    const token = typeof window !== 'undefined' ? localStorage.getItem('vja_admin_token') : null;
    try {
      const res = await fetch(`${API_BASE}/admin/contingencia/retry-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast('Reenvío forzado iniciado');
    } catch {
      toast('API no disponible — el reenvío lo gestiona el backend automáticamente');
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

  const maxIntentos = queue.reduce((m, q) => Math.max(m, q.intentos), 0);

  return (
    <div className="content-wrap fade-in">
      <div className="page-head">
        <div>
          <h1>Contingencia</h1>
          <p>Modo de respaldo ante indisponibilidad de los servicios DGII</p>
        </div>
      </div>

      {/* Status banner */}
      <div
        className="card card-pad"
        style={{
          marginBottom: 18,
          borderColor: activa ? 'var(--cont-bd)' : 'var(--ok-bd)',
          background: activa ? 'var(--cont-bg)' : 'var(--ok-bg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, display: 'grid', placeItems: 'center',
            background: activa ? 'var(--cont)' : 'var(--ok)', color: '#fff', flexShrink: 0,
          }}>
            <Icon name={activa ? 'contingencia' : 'checkcircle'} style={{ width: 24, height: 24 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 750, color: activa ? 'var(--cont)' : 'var(--ok)', marginBottom: 2 }}>
              {activa ? 'En contingencia' : 'Operación normal'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
              {activa
                ? `${queue.length} e-CF en cola de reintento. Los comprobantes se almacenan firmados y se reenvían automáticamente.`
                : 'Todos los servicios DGII operativos. Sin elementos en cola.'}
            </div>
          </div>
          {activa && (
            <button className="btn primary" onClick={handleForzarReenvio}>
              <Icon name="refresh" />Forzar reenvío
            </button>
          )}
        </div>
      </div>

      {/* KPIs — only show real values: queue count is real; others are 0 without backend */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 18 }}>
        <KPICard icon="inbox"      iconBg="var(--cont-bg)" iconColor="var(--cont)" label="En cola de reintento" value={String(queue.length)} />
        <KPICard icon="refresh"    iconBg="var(--info-bg)" iconColor="var(--info)" label="Max. intentos en cola" value={String(maxIntentos)} unit="/5" />
        <KPICard icon="checkcircle" iconBg="var(--ok-bg)"  iconColor="var(--ok)"  label="Historial de eventos" value={String(hist.length)} />
        <KPICard icon="clock"      iconBg="var(--warn-bg)" iconColor="var(--warn)" label="Estado" value={activa ? 'Contingencia' : 'Normal'} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        {/* Queue */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Cola de reintento</h3>
              <p>Próximo intento automático en orden</p>
            </div>
            <span className="badge cont">
              <i className="bdot" />{queue.length} pendiente{queue.length !== 1 ? 's' : ''}
            </span>
          </div>
          {queue.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
              Cola vacía — sin e-CF en reintento
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>eNCF</th><th>Cliente</th><th>Motivo</th>
                    <th className="num">Intentos</th><th>Próximo</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((q, i) => (
                    <tr key={i}>
                      <td className="mono strong">{q.encf}</td>
                      <td>{q.cliente.length > 22 ? q.cliente.slice(0, 22) + '…' : q.cliente}</td>
                      <td><span className="muted" style={{ fontSize: 12 }}>{q.motivo}</span></td>
                      <td className="num">
                        <Badge cls={q.intentos >= 4 ? 'err' : 'warn'}>{q.intentos}/5</Badge>
                      </td>
                      <td className="mono" style={{ color: 'var(--cont)', fontWeight: 600 }}>{q.proximo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* History */}
        <div className="card">
          <div className="card-head">
            <div><h3>Historial de eventos</h3></div>
          </div>
          <div className="card-pad" style={{ paddingTop: 6 }}>
            {hist.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5, padding: '24px 0' }}>
                Sin eventos registrados
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: 4 }}>
                {hist.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', gap: 12,
                      paddingBottom: i === hist.length - 1 ? 0 : 18,
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{
                        width: 11, height: 11, borderRadius: '50%',
                        background: h.tipo === 'ok' ? 'var(--ok)' : 'var(--cont)',
                        flexShrink: 0, marginTop: 3, zIndex: 1,
                      }} />
                      {i !== hist.length - 1 && (
                        <span style={{ width: 2, flex: 1, background: 'var(--border)', marginTop: 2 }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: 2 }}>
                      <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--text)' }}>{h.evt}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 3px' }}>{h.det}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{h.ts}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {toastNode}
    </div>
  );
}
