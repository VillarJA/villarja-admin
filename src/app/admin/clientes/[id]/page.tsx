'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icons';
import { Badge, EstadoBadge, PlanPill } from '@/components/ui/Badge';
import { CoMark } from '@/components/ui/CoMark';
import { useToast } from '@/components/ui/Toast';
import { PLAN_LIMITS, ECF_TYPES, fmtNum, fmtDOP, fmtDateTime } from '@/lib/data';
import {
  getClienteById, getFacturasForCliente, getSecuencias,
  regenerateApiKey, updateCompanyEstado,
  uploadCertificate, updateCertPassword,
  syncSecuenciasUsadas,
} from '@/lib/data-layer';
import { CambiarPlanModal } from '@/components/modals/CambiarPlanModal';
import { CambiarAmbienteModal } from '@/components/modals/CambiarAmbienteModal';
import { CrearSecuenciaModal } from '@/components/modals/CrearSecuenciaModal';
import type { Company, Factura, Secuencia } from '@/types';

export default function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [secuencias, setSecuencias] = useState<Secuencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<'secuencias' | 'facturas'>('secuencias');
  const [showKey, setShowKey] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [showCambiarPlan, setShowCambiarPlan] = useState(false);
  const [showCambiarAmbiente, setShowCambiarAmbiente] = useState(false);
  const [showCrearSeq, setShowCrearSeq] = useState(false);
  const [suspendiendo, setSuspendiendo] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [certPassword, setCertPassword] = useState('');
  const [showCertPassword, setShowCertPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [syncingSeq, setSyncingSeq] = useState(false);
  const [toastNode, toast] = useToast();

  useEffect(() => {
    Promise.all([
      getClienteById(id),
      getFacturasForCliente(id),
      getSecuencias(id),
    ]).then(([co, fa, se]) => {
      if (!co) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCompany(co);
      setFacturas(fa);
      setSecuencias(se);
      setCurrentApiKey(co.apiKey);
      if (co.certPassword) setCertPassword(co.certPassword);
      setLoading(false);
    });
  }, [id]);

  const handleRegenerateKey = async () => {
    if (!company) return;
    if (!confirm('¿Regenerar el API Key? La llave anterior quedará inválida de inmediato.')) return;
    setRegenerating(true);
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

  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;
    setUploadError('');
    let certMeta: { subject: string; vence: string } | undefined;
    if (certPassword.trim()) {
      try {
        const fd = new FormData();
        fd.append('cert', file);
        fd.append('password', certPassword);
        const res = await fetch('/api/parse-cert', { method: 'POST', body: fd });
        const json = await res.json();
        if (res.ok) certMeta = { subject: json.subject ?? '', vence: json.vence ?? '' };
      } catch { /* parsing failed — upload without metadata */ }
    }
    try {
      await uploadCertificate(company.id, file, company.razon, certMeta);
      toast('Certificado subido exitosamente');
      setCompany((c) => c ? {
        ...c,
        cert: 'Vigente',
        certSubject: certMeta?.subject || c.certSubject,
        certVence: certMeta?.vence || c.certVence,
      } : c);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir el certificado');
    }
    e.target.value = '';
  };

  const handleSavePassword = async () => {
    if (!company || !certPassword.trim()) return;
    setSavingPassword(true);
    try {
      await updateCertPassword(company.id, certPassword, company.razon);
      toast('Contraseña del certificado guardada');
    } catch (err) {
      toast('Error: ' + (err instanceof Error ? err.message : 'No se pudo guardar'));
    } finally {
      setSavingPassword(false);
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
            <button className="kbtn" title="Regenerar" onClick={handleRegenerateKey} disabled={regenerating}>
              <Icon name="refresh" style={{ opacity: regenerating ? 0.5 : 1 }} />
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
          {company.certSubject && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="muted" style={{ fontSize: 12.5 }}>Titular</span>
              <span className="strong" style={{ fontSize: 12.5, textAlign: 'right', maxWidth: 160 }}>{company.certSubject}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span className="muted" style={{ fontSize: 12.5 }}>Vencimiento</span>
            <span className="strong mono">{company.certVence}</span>
          </div>
          <label className="btn sm" style={{ width: '100%', textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="file" />
            {company.cert === 'Pendiente' ? 'Subir certificado' : 'Renovar'}
            <input type="file" accept=".p12,.pfx" style={{ display: 'none' }} onChange={handleCertUpload} />
          </label>
          {uploadError && (
            <div className="note" style={{ marginTop: 10, background: 'var(--err-bg)', borderColor: 'var(--err-bd)', color: 'var(--err)', fontSize: 11.5 }}>
              <Icon name="warning" style={{ width: 14, height: 14 }} /><span>{uploadError}</span>
            </div>
          )}
          <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <span className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
              Contraseña del .p12
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type={showCertPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={certPassword}
                  onChange={(e) => setCertPassword(e.target.value)}
                  style={{
                    width: '100%', fontSize: 13, padding: '5px 30px 5px 8px',
                    border: '1px solid var(--border)', borderRadius: 6,
                    background: 'var(--surface)', color: 'var(--text)',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCertPassword((v) => !v)}
                  style={{
                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: 'var(--muted)', display: 'flex', alignItems: 'center',
                  }}
                  title={showCertPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Icon name={showCertPassword ? 'eyeoff' : 'eye'} style={{ width: 15, height: 15 }} />
                </button>
              </div>
              <button
                className="btn sm"
                onClick={handleSavePassword}
                disabled={savingPassword || !certPassword.trim()}
              >
                {savingPassword ? '…' : 'Guardar'}
              </button>
            </div>
            <span className="muted" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
              Requerida por el API para firmar e-CF
            </span>
          </div>
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
          )
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
            getSecuencias(id).then(setSecuencias);
          }}
        />
      )}

      {toastNode}
    </div>
  );
}
