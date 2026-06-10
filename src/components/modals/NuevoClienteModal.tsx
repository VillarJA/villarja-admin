'use client';

import { useState, useRef } from 'react';
import { Icon } from '@/components/Icons';
import { createCompany } from '@/lib/data-layer';
import { buscarRNC } from '@/lib/padron';
import { getProvincias, getMunicipios } from '@/lib/dgii-codes';
import type { Company } from '@/types';

interface Props {
  onClose: () => void;
  onCreated: (company: Company, apiKey: string) => void;
}

export function NuevoClienteModal({ onClose, onCreated }: Props) {
  const [rnc, setRnc] = useState('');
  const [razon, setRazon] = useState('');
  const [alias, setAlias] = useState('');
  const [plan, setPlan] = useState<Company['plan']>('Pro');
  const [amb, setAmb] = useState('eCF');
  const [direccion, setDireccion] = useState('');
  const [provincia, setProvincia] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [padronStatus, setPadronStatus] = useState<'idle' | 'found' | 'suspended' | 'notfound'>('idle');
  const [padronActividad, setPadronActividad] = useState('');
  const [error, setError] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const provincias = getProvincias();
  const municipios = provincia ? getMunicipios(provincia) : [];

  const handleRncChange = (value: string) => {
    setRnc(value);
    setPadronStatus('idle');

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    const clean = value.replace(/\D/g, '');
    if (clean.length < 9) return;

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      const result = await buscarRNC(clean);
      setSearching(false);

      if (result) {
        setPadronStatus(result.activo ? 'found' : 'suspended');
        setPadronActividad(result.actividad);
        // Auto-fill only if fields are empty (don't overwrite manual input)
        if (!razon) setRazon(result.nombre);
        if (!alias) {
          const source = result.nombreComercial || result.nombre;
          setAlias(
            source
              .split(/\s+/)
              .map((w) => w.slice(0, 4).toUpperCase())
              .join('')
              .slice(0, 20)
          );
        }
      } else {
        setPadronStatus('notfound');
        setPadronActividad('');
      }
    }, 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rnc.trim() || !razon.trim() || !alias.trim()) {
      setError('RNC, razón social y alias son requeridos.');
      return;
    }
    if (!direccion.trim()) {
      setError('La dirección del emisor es requerida para los comprobantes fiscales.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const company = await createCompany({
        rnc: rnc.trim(),
        razonSocial: razon.trim(),
        alias: alias.trim().toUpperCase(),
        plan,
        ambiente: amb,
        direccion: direccion.trim(),
        municipio: municipio || undefined,
        provincia: provincia || undefined,
      });
      onCreated(company, company.apiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el cliente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card card-pad"
        style={{ width: 480, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ marginBottom: 2 }}>Nuevo Cliente</h2>
            <p className="muted" style={{ fontSize: 12.5 }}>El API Key se genera automáticamente</p>
          </div>
          <button className="kbtn" onClick={onClose}><Icon name="close" /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* RNC with padron lookup */}
          <div>
            <label className="cfg-label">RNC / Cédula *</label>
            <div style={{ position: 'relative' }}>
              <input
                className="cfg-inp mono"
                value={rnc}
                onChange={(e) => handleRncChange(e.target.value)}
                placeholder="101234567"
                maxLength={11}
                required
                style={{ paddingRight: 34 }}
              />
              {searching && (
                <span style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 11, color: 'var(--text-muted)',
                }}>
                  ⟳
                </span>
              )}
              {!searching && padronStatus === 'found' && (
                <span style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--ok)',
                }}>
                  <Icon name="check" style={{ width: 15, height: 15 }} />
                </span>
              )}
              {!searching && padronStatus === 'notfound' && (
                <span style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}>
                  <Icon name="warning" style={{ width: 15, height: 15 }} />
                </span>
              )}
            </div>
            {padronStatus === 'found' && (
              <p style={{ fontSize: 11.5, color: 'var(--ok)', marginTop: 4 }}>
                ✓ Encontrado en el padrón DGII{padronActividad ? ` · ${padronActividad}` : ''}
              </p>
            )}
            {padronStatus === 'suspended' && (
              <p style={{ fontSize: 11.5, color: 'var(--warn)', marginTop: 4 }}>
                ⚠ Contribuyente SUSPENDIDO en el padrón DGII — verifica antes de registrar
              </p>
            )}
            {padronStatus === 'notfound' && (
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                No encontrado en el padrón — verifica el RNC o ingresa los datos manualmente
              </p>
            )}
          </div>

          <div>
            <label className="cfg-label">Razón Social *</label>
            <input
              className="cfg-inp"
              value={razon}
              onChange={(e) => setRazon(e.target.value)}
              placeholder="Empresa Ejemplo SRL"
              required
            />
          </div>

          <div>
            <label className="cfg-label">Alias (nombre corto) *</label>
            <input
              className="cfg-inp mono"
              value={alias}
              onChange={(e) => setAlias(e.target.value.toUpperCase())}
              placeholder="EMPEJEMPLO"
              maxLength={20}
              required
            />
          </div>

          {/* ── Datos del Emisor ECF ─────────────────────────────────────── */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: -2 }}>
            <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Datos del Emisor (eCF)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="cfg-label">Dirección *</label>
                <input
                  className="cfg-inp"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle / Av., No., Sector"
                  maxLength={100}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  Requerido por el XSD del eCF (T32 y otros)
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="cfg-label">Provincia</label>
                  <select
                    className="cfg-inp"
                    value={provincia}
                    onChange={(e) => { setProvincia(e.target.value); setMunicipio(''); }}
                  >
                    <option value="">— Seleccionar —</option>
                    {provincias.map((p) => (
                      <option key={p.code} value={p.code}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="cfg-label">Municipio</label>
                  <select
                    className="cfg-inp"
                    value={municipio}
                    onChange={(e) => setMunicipio(e.target.value)}
                    disabled={!provincia}
                  >
                    <option value="">— Seleccionar —</option>
                    {municipios.map((m) => (
                      <option key={m.code} value={m.code}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="cfg-label">Plan</label>
              <select className="cfg-inp" value={plan} onChange={(e) => setPlan(e.target.value as Company['plan'])}>
                <option value="Básico">Básico — $2,500</option>
                <option value="Pro">Pro — $8,900</option>
                <option value="Enterprise">Enterprise — $29,500</option>
              </select>
            </div>
            <div>
              <label className="cfg-label">Ambiente</label>
              <select className="cfg-inp" value={amb} onChange={(e) => setAmb(e.target.value)}>
                <option value="testeCF">testeCF (pruebas)</option>
                <option value="certeCF">certeCF (cert.)</option>
                <option value="eCF">eCF (producción)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="note" style={{ background: 'var(--err-bg)', borderColor: 'var(--err-bd)', color: 'var(--err)' }}>
              <Icon name="warning" /><span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn primary" disabled={loading || searching}>
              {loading ? 'Creando…' : <><Icon name="plus" />Crear Cliente</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ApiKeyRevealProps {
  company: Company;
  apiKey: string;
  onClose: () => void;
}

export function ApiKeyRevealModal({ company, apiKey, onClose }: ApiKeyRevealProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div className="card card-pad" style={{ width: 480, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{
            width: 40, height: 40, borderRadius: 10, background: 'var(--ok-bg)',
            color: 'var(--ok)', display: 'grid', placeItems: 'center',
          }}>
            <Icon name="checkcircle" style={{ width: 22, height: 22 }} />
          </span>
          <div>
            <h3 style={{ marginBottom: 2 }}>Cliente creado exitosamente</h3>
            <p className="muted" style={{ fontSize: 12.5 }}>{company.razon}</p>
          </div>
        </div>

        <div className="note info" style={{ marginBottom: 14 }}>
          <Icon name="shield" />
          <div>Guarda esta API Key ahora. No se mostrará completa de nuevo.</div>
        </div>

        <div className="apikey-box" style={{ marginBottom: 18 }}>
          <code style={{ fontSize: 12 }}>{apiKey}</code>
          <button className="kbtn" onClick={copy}>
            <Icon name={copied ? 'check' : 'copy'} />
          </button>
        </div>

        <div className="kv" style={{ marginBottom: 18, fontSize: 12.5 }}>
          <dt>RNC</dt><dd className="mono">{company.rnc}</dd>
          <dt>Plan</dt><dd>{company.plan}</dd>
          <dt>Ambiente</dt><dd><span className="tag-type">{company.amb}</span></dd>
        </div>

        <button className="btn primary" style={{ width: '100%' }} onClick={onClose}>
          Entendido
        </button>
      </div>
    </div>
  );
}
