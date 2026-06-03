'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icons';
import { LogoFull } from '@/components/layout/Logo';
import { adminApi } from '@/lib/api';
import { setToken, setStoredUser, isAuthenticated } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated()) router.replace('/admin/dashboard');
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let token: string;
      let user: { email: string; name: string };

      if (supabase) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (authError || !data.session) {
          throw new Error(authError?.message || 'invalid_credentials');
        }
        token = data.session.access_token;
        user = { email: data.user.email ?? email, name: (data.user.user_metadata?.name as string) ?? email };
      } else {
        const data = await adminApi.login(email, pw);
        token = data.token;
        user = data.user;
      }

      setToken(token);
      setStoredUser(user);
      const maxAge = remember ? `; max-age=${60 * 60 * 24 * 7}` : '';
      document.cookie = `vja_admin_token=${token}; path=/${maxAge}; SameSite=Strict`;
      router.push('/admin/dashboard');
    } catch {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdmlsbGFyamEuY29tIiwiZXhwIjo5OTk5OTk5OTk5fQ.demo';
    setToken(fakeToken);
    setStoredUser({ email: 'demo@villarja.com', name: 'Demo' });
    document.cookie = `vja_admin_token=${fakeToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`;
    router.push('/admin/dashboard');
  };

  return (
    <div className="login-stage">
      <div className="login-aside">
        <div className="la-grid" />
        <div className="la-top">
          <span className="la-logo-mark">VJ</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>Villar JA</div>
            <div style={{ color: '#9092a8', fontSize: 11.5 }}>Data y Tecnología</div>
          </div>
        </div>
        <div className="la-mid">
          <h2>Portal de Administración</h2>
          <p>
            Plataforma centralizada para gestionar clientes, operaciones y productos Villar JA.
            Controla facturación electrónica e-CF, y próximamente FluxyMed y FluxyGo desde un solo lugar.
          </p>
        </div>
        <div className="la-foot">
          <div className="la-product">
            <span className="la-product-dot active" />
            <span><b>e-CF</b> Facturación electrónica</span>
          </div>
          <div className="la-product">
            <span className="la-product-dot soon" />
            <span><b>FluxyMed</b> Salud digital</span>
          </div>
          <div className="la-product">
            <span className="la-product-dot soon" />
            <span><b>FluxyGo</b> Logística</span>
          </div>
        </div>
      </div>

      <div className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
            <LogoFull />
          </div>
          <h1>Iniciar sesión</h1>
          <p className="lc-sub">Portal de administración Villar JA</p>

          {error && (
            <div className="note warn" style={{ marginBottom: 16 }}>
              <Icon name="contingencia" />
              <div>{error}</div>
            </div>
          )}

          <div className="field">
            <label>Correo electrónico</label>
            <div className="inp-wrap">
              <Icon name="mail" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@villarja.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="field">
            <label>Contraseña</label>
            <div className="inp-wrap">
              <Icon name="lock" />
              <input
                type={show ? 'text' : 'password'}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button type="button" className="eye" onClick={() => setShow((s) => !s)}>
                <Icon name={show ? 'eyeoff' : 'eye'} />
              </button>
            </div>
          </div>

          <div className="login-row">
            <label onClick={(e) => { e.preventDefault(); setRemember((r) => !r); }}>
              <span className={`checkbox${remember ? ' on' : ''}`}>
                {remember && <Icon name="check" />}
              </span>
              Recordarme
            </label>
            <a href="#">¿Olvidaste tu contraseña?</a>
          </div>

          <button className="btn primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Verificando…' : 'Entrar al portal'}
          </button>

          <button
            type="button"
            className="btn btn-block"
            style={{ marginTop: 10 }}
            onClick={demoLogin}
          >
            Entrar en modo demo
          </button>

          <div className="login-foot">
            Acceso restringido · Solo personal autorizado de Villar JA
          </div>
        </form>
      </div>
    </div>
  );
}
