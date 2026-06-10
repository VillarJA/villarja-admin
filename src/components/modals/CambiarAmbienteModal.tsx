'use client';

import { useState } from 'react';
import { Icon } from '@/components/Icons';
import { updateCompanyAmbiente } from '@/lib/data-layer';
import type { Company } from '@/types';

interface Props {
  company: Company;
  onClose: () => void;
  onUpdated: (newAmbiente: string, newKey: string) => void;
}

const AMBIENTES: { value: string; label: string; prefix: string; desc: string }[] = [
  { value: 'testeCF',  label: 'testeCF',  prefix: 'vja_test_', desc: 'Pruebas — sin impacto fiscal' },
  { value: 'certeCF',  label: 'certeCF',  prefix: 'vja_cert_', desc: 'Certificación DGII' },
  { value: 'eCF',      label: 'eCF',      prefix: 'vja_live_', desc: 'Producción — impacto fiscal real' },
];

export function CambiarAmbienteModal({ company, onClose, onUpdated }: Props) {
  const [selected, setSelected] = useState(company.amb);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (selected === company.amb) { onClose(); return; }
    setLoading(true);
    setError('');
    try {
      const newKey = await updateCompanyAmbiente(company.id, selected, company.razon);
      onUpdated(selected, newKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar el ambiente.');
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
      <div role="dialog" aria-modal="true" aria-labelledby="cambiar-ambiente-title" className="card card-pad" style={{ width: 440, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 id="cambiar-ambiente-title" style={{ marginBottom: 2 }}>Cambiar Ambiente</h3>
            <p className="muted" style={{ fontSize: 12.5 }}>{company.razon}</p>
          </div>
          <button className="kbtn" onClick={onClose}><Icon name="close" /></button>
        </div>

        <div
          className="note"
          style={{ background: 'var(--warn-bg)', borderColor: 'var(--warn-bd)', color: 'var(--warn)', marginBottom: 16 }}
        >
          <Icon name="warning" />
          <span>Al cambiar el ambiente se generará una nueva API Key y la anterior quedará <b>inválida de inmediato</b>.</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {AMBIENTES.map((a) => (
            <button
              key={a.value}
              onClick={() => setSelected(a.value)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 10,
                border: `2px solid ${selected === a.value ? 'var(--brand)' : 'var(--border)'}`,
                background: selected === a.value ? 'var(--brand-soft)' : 'var(--surface)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: selected === a.value ? 'var(--brand)' : 'var(--text)' }}>
                  {a.label}
                  {company.amb === a.value && (
                    <span className="badge info" style={{ marginLeft: 8, fontSize: 10 }}>actual</span>
                  )}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {a.desc} &nbsp;·&nbsp; <code style={{ fontSize: 11 }}>{a.prefix}…</code>
                </div>
              </div>
              {selected === a.value && (
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
          <button
            className="btn danger"
            onClick={handleSave}
            disabled={loading || selected === company.amb}
          >
            {loading ? 'Cambiando…' : 'Cambiar Ambiente y Regenerar Key'}
          </button>
        </div>
      </div>
    </div>
  );
}
