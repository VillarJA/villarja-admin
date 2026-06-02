'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icons';
import { Badge, EstadoBadge, PlanPill } from '@/components/ui/Badge';
import { CoMark } from '@/components/ui/CoMark';
import { useToast } from '@/components/ui/Toast';
import { PLAN_LIMITS, ECF_TYPES, fmtNum, fmtDOP, fmtDateTime } from '@/lib/data';
import { getClienteById, getFacturasForCliente, getSecuencias } from '@/lib/data-layer';
import { adminApi } from '@/lib/api';
import type { Company, Factura, Secuencia } from '@/types';

export default function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [secuencias, setSecuencias] = useState<Secuencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'secuencias' | 'facturas'>('secuencias');
  const [showKey, setShowKey] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState('');
  const [toastNode, toast] = useToast();

  useEffect(() => {
    Promise.all([
      getClienteById(id),
      getFacturasForCliente(id),
      getSecuencias(id),
    ]).then(([co, fa, se]) => {
      setCompany(co);
      setFacturas(fa);
      setSecuencias(se);
      setCurrentApiKey(co.apiKey);
      setLoading(false);
    });
  }, [id]);

  const handleRegenerateKey = async () => {
    if (!company) return;
    try {
      const result = await adminApi.regenerateApiKey(company.id) as { apiKey?: string; api_key?: string };
      const newKey = result?.apiKey ?? result?.api_key;
      if (newKey) setCurrentApiKey(newKey);
      toast('API Key regenerada exitosamente');
    } catch {
      toast('API Key regenerada (modo demo)');
    }
  };

  if (loading || !company) {
    return (
      <div className="content-wrap">
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
          Cargando…
        </div>
      </div>
    );
  }

  const pl = PLAN_LIMITS[company.plan];
  const maskedKey = currentApiKey.slice(0, 12) + '••••••••••••••••';
  const certCls = company.cert === 'Vigente' ? 'ok' : company.cert === 'Por vencer' ? 'warn' : company.cert === 'Vencido' ? 'err' : 'draft';

  return (
    <div className="content-wrap fade-in">
      <div className="page-head">
        <div>
          <div
            className="breadcrumb"
            style={{ marginBottom: 8, cursor: 'pointer' }}
            onClick={() => router.push('/admin/clientes')}
          >
            <Icon name="chevleft" style={{ width: 14, height: 14 }} />
            Volver a Clientes
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <CoMark cliente={company} size={46} />
            <div>
              <h1 style={{ marginBottom: 4 }}>{company.razon}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mono muted">RNC {company.rnc}</span>
                <PlanPill plan={company.plan} />
                <Badge cls={company.estado === 'Activo' ? 'ok' : company.estado === 'Suspendido' ? 'err' : 'warn'}>
                  {company.estado}
                </Badge>
                <span className="tag-type">Ambiente: {company.amb}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={() => toast('Plan: selector abierto')}>
            <Icon name="planes" />Cambiar Plan
          </button>
          <button className="btn danger" onClick={() => toast('Cliente suspendido')}>
            <Icon name="power" />Suspender
          </button>
        </div>
      </div>

      {/* Top cards */}
      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr 1fr', marginBottom: 18 }}>
        {/* API Key */}
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Icon name="key" style={{ width: 17, height: 17, color: 'var(--brand)' }} />
            <b style={{ fontSize: 13.5 }}>API Key (Producción)</b>
          </div>
          <div className="apikey-box">
            <code>{showKey ? currentApiKey : maskedKey}</code>
            <button className="kbtn" title={showKey ? 'Ocultar' : 'Mostrar'} onClick={() => setShowKey((s) => !s)}>
              <Icon name={showKey ? 'eyeoff' : 'eye'} />
            </button>
            <button className="kbtn" title="Copiar" onClick={() => {
              navigator.clipboard?.writeText(currentApiKey);
              toast('API Key copiada al portapapeles');
            }}>
              <Icon name="copy" />
            </button>
            <button className="kbtn" title="Regenerar" onClick={handleRegenerateKey}>
              <Icon name="refresh" />
            </button>
          </div>
          <div className="note info" style={{ marginTop: 12 }}>
            <Icon name="shield" />
            <div>Regenerar la llave invalida la anterior de inmediato. Notifica al cliente antes de hacerlo.</div>
          </div>
        </div>

        {/* Certificado */}
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Icon name="cert" style={{ width: 17, height: 17, color: 'var(--brand)' }} />
            <b style={{ fontSize: 13.5 }}>Certificado .p12</b>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="muted" style={{ fontSize: 12.5 }}>Estado</span>
            <Badge cls={certCls}>{company.cert}</Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span className="muted" style={{ fontSize: 12.5 }}>Vencimiento</span>
            <span className="strong mono">{company.certVence}</span>
          </div>
          <button className="btn sm" style={{ width: '100%' }} onClick={() => toast(company.cert === 'Pendiente' ? 'Subir certificado' : 'Renovar certificado')}>
            <Icon name="file" />{company.cert === 'Pendiente' ? 'Subir certificado' : 'Renovar'}
          </button>
        </div>

        {/* Plan */}
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Icon name="planes" style={{ width: 17, height: 17, color: 'var(--brand)' }} />
            <b style={{ fontSize: 13.5 }}>Plan {company.plan}</b>
          </div>
          <div className="stat-row" style={{ marginBottom: 4 }}>
            <b>{fmtNum(company.facturasMes)}</b>
            <span>/ {fmtNum(pl.facturas)} e-CF</span>
          </div>
          <div className="meter" style={{ marginBottom: 12 }}>
            <i style={{ width: Math.min(100, (company.facturasMes / pl.facturas) * 100) + '%' }} />
          </div>
          <div className="kv" style={{ gridTemplateColumns: '1fr auto', gap: '7px 10px', fontSize: 12.5 }}>
            <dt>Tipos e-CF</dt><dd style={{ textAlign: 'right' }}>{pl.tipos}</dd>
            <dt>Empresas</dt><dd style={{ textAlign: 'right' }}>{pl.empresas}</dd>
            <dt>Cuota mensual</dt><dd style={{ textAlign: 'right' }}>${fmtNum(pl.precio)} DOP</dd>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="tabs" style={{ padding: '0 8px' }}>
          <button className={tab === 'secuencias' ? 'on' : ''} onClick={() => setTab('secuencias')}>
            Secuencias e-NCF
          </button>
          <button className={tab === 'facturas' ? 'on' : ''} onClick={() => setTab('facturas')}>
            Últimas facturas
          </button>
        </div>

        {tab === 'secuencias' && (
          <div>
            <div className="toolbar" style={{ justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: 12.5 }}>{secuencias.length} secuencias autorizadas por la DGII</span>
              <button className="btn sm primary" onClick={() => toast('Crear secuencia e-NCF')}>
                <Icon name="plus" />Crear Secuencia
              </button>
            </div>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Tipo</th><th>Rango autorizado</th>
                    <th className="num">Usadas</th><th className="num">Disponibles</th>
                    <th>Consumo</th><th>Vence</th>
                  </tr>
                </thead>
                <tbody>
                  {secuencias.map((s, i) => {
                    const disp = s.hasta - s.usadas;
                    const pct = (s.usadas / s.hasta) * 100;
                    const mc = pct > 90 ? 'err' : pct > 75 ? 'warn' : 'ok';
                    return (
                      <tr key={i}>
                        <td>
                          <span className="tag-type">{s.tipo}</span>
                          <span className="strong" style={{ marginLeft: 6 }}>{s.desc}</span>
                        </td>
                        <td className="mono">
                          {String(s.desde).padStart(8, '0')} – {String(s.hasta).padStart(8, '0')}
                        </td>
                        <td className="num">{fmtNum(s.usadas)}</td>
                        <td className="num strong">{fmtNum(disp)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className={`meter ${mc}`} style={{ width: 90 }}>
                              <i style={{ width: pct + '%' }} />
                            </div>
                            <span className="muted" style={{ fontSize: 11.5, width: 34 }}>
                              {pct.toFixed(0)}%
                            </span>
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
              <thead>
                <tr>
                  <th>eNCF</th><th>Tipo</th>
                  <th className="num">Monto</th><th className="num">ITBIS</th>
                  <th>Fecha</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {facturas.map((f) => (
                  <tr key={f.id}>
                    <td className="mono">{f.encf}</td>
                    <td>
                      <span className="tag-type">{f.tipo}</span>{' '}
                      {ECF_TYPES[f.tipo]}
                    </td>
                    <td className="num strong">${fmtDOP(f.monto)}</td>
                    <td className="num muted">${fmtDOP(f.itbis)}</td>
                    <td className="muted">{fmtDateTime(f.fecha)}</td>
                    <td><EstadoBadge estado={f.estado} /></td>
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
