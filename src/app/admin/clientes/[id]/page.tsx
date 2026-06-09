'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icons';
import { Badge, EstadoBadge, PlanPill } from '@/components/ui/Badge';
import { CoMark } from '@/components/ui/CoMark';
import { useToast } from '@/components/ui/Toast';
import { PLAN_LIMITS, ECF_TYPES, fmtNum, fmtDOP, fmtDateTime } from '@/lib/data';
import {
  getClienteById, getFacturasForCliente, refreshSecuenciasUsadas, getRecepcionesForCliente,
  regenerateApiKey, updateCompanyEstado,
  syncSecuenciasUsadas,
} from '@/lib/data-layer';
import { CambiarPlanModal } from '@/components/modals/CambiarPlanModal';
import { CambiarAmbienteModal } from '@/components/modals/CambiarAmbienteModal';
import { CrearSecuenciaModal } from '@/components/modals/CrearSecuenciaModal';
import { GestionarCertificadoModal } from '@/components/modals/GestionarCertificadoModal';
import type { Company, Factura, Secuencia, Recepcion } from '@/types';

export default function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [secuencias, setSecuencias] = useState<Secuencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<'secuencias' | 'facturas' | 'recepciones'>('secuencias');
  const [recepciones, setRecepciones] = useState<Recepcion[]>([]);
  const [showKey, setShowKey] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [showCambiarPlan, setShowCambiarPlan] = useState(false);
  const [showCambiarAmbiente, setShowCambiarAmbiente] = useState(false);
  const [showCrearSeq, setShowCrearSeq] = useState(false);
  const [suspendiendo, setSuspendiendo] = useState(false);
  const [showGestionarCert, setShowGestionarCert] = useState(false);
  const [confirmRegenKey, setConfirmRegenKey] = useState(false);
  const [syncingSeq, setSyncingSeq] = useState(false);
  const [deletingEcfId, setDeletingEcfId] = useState<string | null>(null);
  const [toastNode, toast] = useToast();

  useEffect(() => {
    Promise.all([
      getClienteById(id),
      getFacturasForCliente(id),
      refreshSecuenciasUsadas(id),
      getRecepcionesForCliente(id),
    ]).then(([co, fa, se, re]) => {
      if (!co) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCompany(co);
      setFacturas(fa);
      setSecuencias(se);
      setRecepciones(re);
      setCurrentApiKey(co.apiKey);
      setLoading(false);
    });
  }, [id]);

  const handleRegenerateKey = async () => {
    if (!company) return;
    setRegenerating(true);
    setConfirmRegenKey(false);
    try {
      const newKey = await regenerateApiKey(company.id, company.razon, company.amb);
      setCurrentApiKey(newKey);
      setShowKey(true);
      toast('API Key regenerada exitosamente');
    } catch (err) {
      toast('Error: ' + (err instanceof Error ? err.message : 'No se pudo regenerar'));
    } finally {
      setRegenerating(false);
    }
  };

  const handleSuspender = async () => {
    if (!company) return;
    const nuevoEstado: Company['estado'] = company.estado === 'Activo' ? 'Suspendido' : 'Activo';
    const msg = nuevoEstado === 'Suspendido'
      ? `¿Suspender a ${company.razon}? El acceso a la API quedará bloqueado.`
      : company.estado === 'Pendiente'
        ? `¿Activar a ${company.razon}? Esto habilitará el acceso a la API.`
        : `¿Reactivar a ${company.razon}?`;
    if (!confirm(msg)) return;
    setSuspendiendo(true);
    try {
      await updateCompanyEstado(company.id, nuevoEstado, company.razon);
      setCompany((c) => c ? { ...c, estado: nuevoEstado } : c);
      const label = nuevoEstado === 'Suspendido' ? 'Cliente suspendido' : nuevoEstado === 'Activo' && company.estado === 'Pendiente' ? 'Cliente activado' : 'Cliente reactivado';
      toast(label);
    } catch (err) {
      toast('Error: ' + (err instanceof Error ? err.message : 'No se pudo actualizar'));
    } finally {
      setSuspendiendo(false);
    }
  };

  const handleSyncSecuencias = async () => {
    if (!company) return;
    setSyncingSeq(true);
    try {
      const updated = await syncSecuenciasUsadas(company.id, company.razon);
      setSecuencias(updated);
      toast('Contadores sincronizados con el historial de e-CF emitidos');
    } catch (err) {
      toast('Error al sincronizar: ' + (err instanceof Error ? err.message : 'Intenta de nuevo'));
    } finally {
      setSyncingSeq(false);
    }
  };

  if (loading || !company) {
    if (notFound) {
      return (
        <div className="content-wrap">
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <h2 style={{ marginBottom: 8 }}>Cliente no encontrado</h2>
            <p className="muted" style={{ marginBottom: 18, fontSize: 13.5 }}>
              El registro fue eliminado o no existe en Supabase.
            </p>
            <button className="btn" onClick={() => router.push('/admin/clientes')}>
              <Icon name="chevleft" />Volver a Clientes
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="content-wrap">
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
          Cargando…
        </div>
      </div>
    );
  }

  const pl = PLAN_LIMITS[company.plan] ?? PLAN_LIMITS['Pro'];
  const maskedKey = currentApiKey.slice(0, 12) + '••••••••••••••••';
  const certCls = company.cert === 'Vigente' ? 'ok' : company.cert === 'Por vencer' ? 'warn' : company.cert === 'Vencido' ? 'err' : 'draft';

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://ecf.villarja.com';

  async function downloadEcfFile(ecfId: string, type: 'xml' | 'pdf', encf: string) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/ecf/${ecfId}/${type}`, {
        headers: { 'X-API-Key': currentApiKey },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${encf || ecfId}.${type}`;
      a.click();
      URL.revokeObjectURL(href);
    } catch (err) {
      toast('Error al descargar: ' + (err instanceof Error ? err.message : 'Intenta de nuevo'));
    }
  }

  async function handleDeleteEcf(ecfId: string) {
    if (!confirm('¿Eliminar este borrador? Esta acción no se puede deshacer.')) return;
    setDeletingEcfId(ecfId);
    try {
      const res = await fetch(`${API_BASE}/api/v1/ecf/${ecfId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': currentApiKey },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setFacturas((prev) => prev.filter((f) => f.id !== ecfId));
      toast('Borrador eliminado');
    } catch (err) {
      toast('Error al eliminar: ' + (err instanceof Error ? err.message : 'Intenta de nuevo'));
    } finally {
      setDeletingEcfId(null);
    }
  }

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
          <button className="btn" onClick={() => setShowCambiarPlan(true)}>
            <Icon name="planes" />Cambiar Plan
          </button>
          <button className="btn" onClick={() => setShowCambiarAmbiente(true)}>
            <Icon name="globe" />Cambiar Ambiente
          </button>
          <button
            className={`btn ${company.estado === 'Activo' ? 'danger' : 'primary'}`}
            onClick={handleSuspender}
            disabled={suspendiendo}
          >
            <Icon name="power" />
            {suspendiendo ? '…' :
              company.estado === 'Pendiente' ? 'Activar' :
              company.estado === 'Suspendido' ? 'Reactivar' : 'Suspender'}
          </button>
        </div>
      </div>

      {/* Top cards */}
      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr 1fr', marginBottom: 18 }}>
        {/* API Key */}
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Icon name="key" style={{ width: 17, height: 17, color: 'var(--brand)' }} />
            <b style={{ fontSize: 13.5 }}>API Key activa</b>
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
            <button
              className="kbtn"
              title="Regenerar"
              onClick={() => setConfirmRegenKey(true)}
              disabled={regenerating || confirmRegenKey}
            >
              <Icon name="refresh" style={{ opacity: regenerating ? 0.5 : 1 }} />
            </button>
          </div>
          {confirmRegenKey ? (
            <div className="note warn" style={{ marginTop: 12 }}>
              <Icon name="warning" />
              <div style={{ flex: 1 }}>
                <b>La llave anterior quedará inválida de inmediato.</b>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn sm danger" onClick={handleRegenerateKey} disabled={regenerating}>
                    {regenerating ? 'Regenerando…' : 'Confirmar'}
                  </button>
                  <button className="btn sm" onClick={() => setConfirmRegenKey(false)} disabled={regenerating}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="note info" style={{ marginTop: 12 }}>
              <Icon name="shield" />
              <div>Regenerar invalida la llave anterior. Notifica al cliente antes de hacerlo.</div>
            </div>
          )}
        </div>

        {/* Certificado */}
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Icon name="cert" style={{ width: 17, height: 17, color: 'var(--brand)' }} />
            <b style={{ fontSize: 13.5 }}>Certificado .p12</b>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: 12.5 }}>Estado</span>
              <Badge cls={certCls}>{company.cert}</Badge>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: 12.5 }}>Titular</span>
              <span
                className="strong"
                style={{ fontSize: 12.5, textAlign: 'right', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={company.certSubject}
              >
                {company.certSubject || '—'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: 12.5 }}>Vencimiento</span>
              <span className="strong mono">{company.certVence || '—'}</span>
            </div>
          </div>
          <button
            className={`btn sm${company.cert === 'Pendiente' ? ' primary' : ''}`}
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => setShowGestionarCert(true)}
          >
            <Icon name={company.cert === 'Pendiente' ? 'file' : 'cert'} />
            {company.cert === 'Pendiente' ? 'Subir certificado' : 'Gestionar certificado'}
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
          <button className={tab === 'recepciones' ? 'on' : ''} onClick={() => setTab('recepciones')}>
            Recepciones
            {recepciones.filter((r) => !r.procesado).length > 0 && (
              <span style={{
                marginLeft: 6, fontSize: 11, fontWeight: 700,
                background: 'var(--brand)', color: '#fff',
                borderRadius: 10, padding: '1px 6px',
              }}>
                {recepciones.filter((r) => !r.procesado).length}
              </span>
            )}
          </button>
        </div>

        {tab === 'secuencias' && (
          <div>
            <div className="toolbar" style={{ justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: 12.5 }}>{secuencias.length} secuencias autorizadas por la DGII</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn sm"
                  onClick={handleSyncSecuencias}
                  disabled={syncingSeq}
                  title="Recalcula los contadores de 'Usadas' contando los e-CF emitidos en ecf_documents"
                >
                  <Icon name="refresh" style={{ opacity: syncingSeq ? 0.5 : 1 }} />
                  {syncingSeq ? 'Sincronizando…' : 'Sincronizar contadores'}
                </button>
                <button className="btn sm primary" onClick={() => setShowCrearSeq(true)}>
                  <Icon name="plus" />Crear Secuencia
                </button>
              </div>
            </div>
            {secuencias.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                No hay secuencias registradas para este cliente
              </div>
            ) : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Tipo</th><th>Rango autorizado</th><th>Ambiente</th>
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
                          <td><span className="tag-type">{s.ambiente}</span></td>
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
            )}
          </div>
        )}

        {tab === 'facturas' && (
          facturas.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
              No hay facturas registradas para este cliente
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>eNCF</th><th>Tipo</th>
                    <th className="num">Monto</th><th className="num">ITBIS</th>
                    <th>Fecha</th><th>Estado</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((f) => (
                    <tr key={f.id}>
                      <td className="mono">{f.encf || <span className="muted">—</span>}</td>
                      <td>
                        <span className="tag-type">{f.tipo}</span>{' '}
                        {ECF_TYPES[f.tipo]}
                      </td>
                      <td className="num strong">${fmtDOP(f.monto)}</td>
                      <td className="num muted">${fmtDOP(f.itbis)}</td>
                      <td className="muted">{fmtDateTime(f.fecha)}</td>
                      <td><EstadoBadge estado={f.estado} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <button
                            className="icon-btn"
                            title="Descargar XML"
                            disabled={!f.encf}
                            onClick={() => downloadEcfFile(f.id, 'xml', f.encf)}
                            style={{ opacity: f.encf ? 1 : 0.35 }}
                          >
                            <Icon name="download" size={14} />
                          </button>
                          <button
                            className="icon-btn"
                            title="Descargar PDF"
                            disabled={!f.encf}
                            onClick={() => downloadEcfFile(f.id, 'pdf', f.encf)}
                            style={{ opacity: f.encf ? 1 : 0.35 }}
                          >
                            <Icon name="file" size={14} />
                          </button>
                          {f.estado === 'draft' && (
                            <button
                              className="icon-btn"
                              title="Eliminar borrador"
                              disabled={deletingEcfId === f.id}
                              onClick={() => handleDeleteEcf(f.id)}
                              style={{ color: 'var(--err, #e53e3e)', opacity: deletingEcfId === f.id ? 0.5 : 1 }}
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'recepciones' && (
          <div>
            <div className="toolbar" style={{ justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: 12.5 }}>
                Protocolo Emisor-Receptor DGII — e-CF recibidos por este cliente
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="tag-type">
                  {recepciones.filter((r) => !r.procesado).length} pendientes de acuse
                </span>
              </div>
            </div>
            {recepciones.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                No hay e-CF recibidos registrados para este cliente
              </div>
            ) : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>e-NCF</th>
                      <th>Tipo</th>
                      <th>RNC Emisor</th>
                      <th>RNC Comprador</th>
                      <th>Fecha</th>
                      <th>Acuse</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recepciones.map((r) => (
                      <tr key={r.id}>
                        <td className="mono">{r.encf}</td>
                        <td>
                          <span className="tag-type" style={{
                            background: r.tipo === 'aprobacion' ? 'var(--ok-bg)' : undefined,
                            color: r.tipo === 'aprobacion' ? 'var(--ok)' : undefined,
                          }}>
                            {r.tipo === 'aprobacion' ? 'Aprobación' : 'e-CF'}
                          </span>
                          {r.tipoEcf && (
                            <span className="muted" style={{ marginLeft: 6, fontSize: 11.5 }}>
                              {r.tipoEcf} · {ECF_TYPES[r.tipoEcf] ?? ''}
                            </span>
                          )}
                        </td>
                        <td className="mono muted">{r.rncEmisor}</td>
                        <td className="mono muted">{r.rncComprador}</td>
                        <td className="muted">{fmtDateTime(r.fecha)}</td>
                        <td>
                          <Badge cls={r.procesado ? 'ok' : 'warn'}>
                            {r.procesado ? 'Enviado' : 'Pendiente'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showCambiarPlan && (
        <CambiarPlanModal
          company={company}
          onClose={() => setShowCambiarPlan(false)}
          onUpdated={(newPlan) => {
            setCompany((c) => c ? { ...c, plan: newPlan } : c);
            setShowCambiarPlan(false);
            toast(`Plan cambiado a ${newPlan}`);
          }}
        />
      )}

      {showCambiarAmbiente && (
        <CambiarAmbienteModal
          company={company}
          onClose={() => setShowCambiarAmbiente(false)}
          onUpdated={(newAmbiente, newKey) => {
            setCompany((c) => c ? { ...c, amb: newAmbiente } : c);
            setCurrentApiKey(newKey);
            setShowKey(true);
            setShowCambiarAmbiente(false);
            toast(`Ambiente cambiado a ${newAmbiente} — nueva API Key activa`);
          }}
        />
      )}

      {showCrearSeq && (
        <CrearSecuenciaModal
          company={company}
          onClose={() => setShowCrearSeq(false)}
          onCreated={() => {
            setShowCrearSeq(false);
            toast('Secuencia creada. Recargando…');
            refreshSecuenciasUsadas(id).then(setSecuencias);
          }}
        />
      )}

      {showGestionarCert && (
        <GestionarCertificadoModal
          company={company}
          onClose={() => setShowGestionarCert(false)}
          onUpdated={(partial) => {
            setCompany((c) => c ? { ...c, ...partial } : c);
            setShowGestionarCert(false);
            toast('Certificado actualizado');
          }}
        />
      )}

      {toastNode}
    </div>
  );
}
