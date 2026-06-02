'use client';

import { useState } from 'react';
import { Icon } from '@/components/Icons';
import { updateCompanyPlan } from '@/lib/data-layer';
import type { Company } from '@/types';

interface Props {
  company: Company;
  onClose: () => void;
  onUpdated: (plan: Company['plan']) => void;
}

const PLANES: { value: Company['plan']; label: string; precio: string }[] = [
  { value: 'Básico', label: 'Básico', precio: '$2,500 DOP/mes' },
  { value: 'Pro', label: 'Pro', precio: '$8,900 DOP/mes' },
  { value: 'Enterprise', label: 'Enterprise', precio: '$29,500 DOP/mes' },
];

export function CambiarPlanModal({ company, onClose, onUpdated }: Props) {
  const [selected, setSelected] = useState<Company['plan']>(company.plan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (selected === company.plan) { onClose(); return; }
    setLoading(true);
    setError('');
    try {
      await updateCompanyPlan(company.id, selected, company.razon);
      onUpdated(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar el plan.');
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
      <div className="card card-pad" style={{ width: 420, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ marginBottom: 2 }}>Cambiar Plan</h3>
            <p className="muted" style={{ fontSize: 12.5 }}>{company.razon}</p>
          </div>
          <button className="kbtn" onClick={onClose}><Icon name="close" /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {PLANES.map((p) => (
            <button
              key={p.value}
              onClick={() => setSelected(p.value)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 10,
                border: `2px solid ${selected === p.value ? 'var(--brand)' : 'var(--border)'}`,
                background: selected === p.value ? 'var(--brand-soft)' : 'var(--surface)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: selected === p.value ? 'var(--brand)' : 'var(--text)' }}>
                  {p.label}
                  {company.plan === p.value && (
                    <span className="badge info" style={{ marginLeft: 8, fontSize: 10 }}>actual</span>
                  )}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>{p.precio}</div>
              </div>
              {selected === p.value && (
                <Icon name="check" style={{ width: 18, height: 18, color: 'var(--brand)' }} />
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="note" style={{ background: 'var(--err-bg)', borderColor: 'var(--err-bd)', color: 'var(--err)', marginBottom: 14 }}>
            <Icon name="warning" /><span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={loading || selected === company.plan}>
            {loading ? 'Guardando…' : 'Cambiar Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
