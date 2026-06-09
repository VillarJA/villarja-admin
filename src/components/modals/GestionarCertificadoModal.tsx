'use client';

import { useState, useRef } from 'react';
import { Icon } from '@/components/Icons';
import { uploadCertificate, updateCertPassword } from '@/lib/data-layer';
import type { Company } from '@/types';

interface Props {
  company: Company;
  onClose: () => void;
  onUpdated: (partial: { cert?: string; certSubject?: string; certVence?: string }) => void;
}

export function GestionarCertificadoModal({ company, onClose, onUpdated }: Props) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warnNoPassword, setWarnNoPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const certCls = company.cert === 'Vigente' ? 'ok'
    : company.cert === 'Por vencer' ? 'warn'
    : company.cert === 'Vencido' ? 'err'
    : 'draft';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setError('');
    setWarnNoPassword(false);
  };

  const canSubmit = file !== null || password.trim() !== '';

  const actionLabel = file && password.trim()
    ? 'Subir y guardar'
    : file
    ? 'Subir certificado'
    : 'Guardar contraseña';

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (file && !password.trim() && !warnNoPassword) {
      setWarnNoPassword(true);
      return;
    }
    setLoading(true);
    setError('');
    try {
      let certMeta: { subject: string; vence: string } | undefined;
      if (file && password.trim()) {
        try {
          const fd = new FormData();
          fd.append('cert', file);
          fd.append('password', password);
          const res = await fetch('/api/parse-cert', { method: 'POST', body: fd });
          const json = await res.json();
          if (res.ok) certMeta = { subject: json.subject ?? '', vence: json.vence ?? '' };
        } catch { /* parsing failed — upload without metadata */ }
      }
      if (file) {
        await uploadCertificate(company.id, file, company.razon, certMeta);
      }
      if (password.trim()) {
        await updateCertPassword(company.id, password, company.razon);
      }
      onUpdated({
        cert: file ? 'Vigente' : undefined,
        certSubject: certMeta?.subject,
        certVence: certMeta?.vence,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el certificado');
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
      <div className="card card-pad" style={{ width: 440, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, marginBottom: 2 }}>Gestionar certificado</h3>
            <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>{company.razon}</p>
          </div>
          <button className="kbtn" onClick={onClose} disabled={loading}>
            <Icon name="close" />
          </button>
        </div>

        {/* Current cert summary */}
        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '12px 14px', marginBottom: 20,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px',
        }}>
          <div>
            <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Estado actual</div>
            <span className={`badge ${certCls}`}>{company.cert}</span>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Vencimiento</div>
            <span className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>
              {company.certVence || '—'}
            </span>
          </div>
          {company.certSubject && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Titular</div>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{company.certSubject}</span>
            </div>
          )}
        </div>

        {/* Password field */}
        <div style={{ marginBottom: 16 }}>
          <label className="cfg-label">Contraseña del .p12</label>
          <div style={{ position: 'relative' }}>
            <input
              className="cfg-inp"
              type={showPassword ? 'text' : 'password'}
              placeholder="Ingresa la contraseña del certificado"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingRight: 36 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
              }}
              title={showPassword ? 'Ocultar' : 'Mostrar'}
            >
              <Icon name={showPassword ? 'eyeoff' : 'eye'} style={{ width: 15, height: 15 }} />
            </button>
          </div>
          <span className="muted" style={{ fontSize: 11.5, marginTop: 4, display: 'block' }}>
            Requerida para que el API firme los e-CF
          </span>
        </div>

        {/* File picker */}
        <div style={{ marginBottom: 18 }}>
          <label className="cfg-label">Archivo .p12 / .pfx {company.cert !== 'Pendiente' && <span className="muted" style={{ fontWeight: 400 }}>(opcional — solo para renovar)</span>}</label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%', padding: '16px 14px',
              border: `2px dashed ${file ? 'var(--ok-bd)' : 'var(--border-strong)'}`,
              borderRadius: 10,
              background: file ? 'var(--ok-bg)' : 'var(--surface-2)',
              color: file ? 'var(--ok)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
              transition: 'border-color 0.13s, background 0.13s, color 0.13s',
            }}
          >
            <Icon name={file ? 'checkcircle' : 'file'} style={{ width: 18, height: 18 }} />
            {file ? file.name : 'Haz clic para seleccionar un archivo'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".p12,.pfx"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {file && (
            <button
              type="button"
              className="btn ghost sm"
              style={{ marginTop: 6 }}
              onClick={() => {
                setFile(null);
                setWarnNoPassword(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              <Icon name="x" />Quitar archivo
            </button>
          )}
        </div>

        {/* Warning: file selected but no password */}
        {warnNoPassword && (
          <div className="note warn" style={{ marginBottom: 14 }}>
            <Icon name="warning" />
            <div>
              <b>Sin contraseña — el certificado se subirá sin verificar.</b>
              <br />
              No se extraerán titular ni fecha de vencimiento. Haz clic en <b>Subir de todas formas</b> para continuar.
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="note" style={{ background: 'var(--err-bg)', borderColor: 'var(--err-bd)', color: 'var(--err)', marginBottom: 14 }}>
            <Icon name="warning" /><span>{error}</span>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose} disabled={loading}>Cancelar</button>
          <button
            className="btn primary"
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
          >
            {loading ? 'Guardando…' : warnNoPassword ? 'Subir de todas formas' : actionLabel}
          </button>
        </div>

      </div>
    </div>
  );
}
