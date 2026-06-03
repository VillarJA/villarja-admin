'use client';

import { useState } from 'react';
import { Icon } from '@/components/Icons';
import { ECF_TYPES } from '@/lib/data';
import { createSecuencia } from '@/lib/data-layer';
import type { Company } from '@/types';

interface Props {
  company: Company;
  onClose: () => void;
  onCreated: () => void;
}

export function CrearSecuenciaModal({ company, onClose, onCreated }: Props) {
  const [tipoEcf, setTipoEcf] = useState(31);
  const [desde, setDesde] = useState('1');
  const [hasta, setHasta] = useState('10000000');
  const [vence, setVence] = useState(new Date().getFullYear() + 1 + '-12-31');
  const [ambiente, setAmbiente] = useState(company.amb.toLowerCase());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const desdeN = parseInt(desde, 10);
    const hastaN = parseInt(hasta, 10);
    if (isNaN(desdeN) || isNaN(hastaN) || desdeN < 1 || hastaN <= desdeN) {
      setError('El rango debe ser válido (desde < hasta, desde ≥ 1).');
      return;
    }
    if (!vence) { setError('La fecha de vencimiento es requerida.'); return; }
    setLoading(true);
    setError('');
    try {
      await createSecuencia({
        companyId: company.id,
        tipoEcf,
        desde: desdeN,
        hasta: hastaN,
        fechaVencimiento: vence,
        razonCliente: company.razon,
        ambiente,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la secuencia.');
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
      <div className="card card-pad" style={{ width: 460, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ marginBottom: 2 }}>Nueva Secuencia e-NCF</h3>
            <p className="muted" style={{ fontSize: 12.5 }}>{company.razon}</p>
          </div>
          <button className="kbtn" onClick={onClose}><Icon name="close" /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="cfg-label">Ambiente *</label>
            <select
              className="cfg-inp"
              value={ambiente}
              onChange={(e) => setAmbiente(e.target.value)}
            >
              <option value="testecf">testeCF — Pre-certificación (pruebas)</option>
              <option value="certecf">certeCF — Certificación DGII</option>
              <option value="ecf">eCF — Producción</option>
            </select>
          </div>

          <div>
            <label className="cfg-label">Tipo e-CF *</label>
            <select
              className="cfg-inp"
              value={tipoEcf}
              onChange={(e) => setTipoEcf(Number(e.target.value))}
            >
              {Object.entries(ECF_TYPES).map(([t, l]) => (
                <option key={t} value={t}>{t} — {l}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="cfg-label">Desde *</label>
              <input
                className="cfg-inp mono"
                type="number"
                min={1}
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="cfg-label">Hasta *</label>
              <input
                className="cfg-inp mono"
                type="number"
                min={2}
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="cfg-label">Fecha de vencimiento *</label>
            <input
              className="cfg-inp"
              type="date"
              value={vence}
              onChange={(e) => setVence(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="note" style={{ background: 'var(--err-bg)', borderColor: 'var(--err-bd)', color: 'var(--err)' }}>
              <Icon name="warning" /><span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Creando…' : <><Icon name="plus" />Crear Secuencia</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
