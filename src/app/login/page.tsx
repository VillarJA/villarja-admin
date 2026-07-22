'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icons';
import { LogoFull } from '@/components/layout/Logo';
import { removeToken, setToken, setStoredUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function persistAdminSession(
  token: string,
  user: { email: string; name: string },
  remember: boolean,
): void {
  setToken(token);
  setStoredUser(user);
  const maxAge = remember ? `; max-age=${60 * 60 * 24 * 7}` : '';
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `vja_admin_token=${token}; path=/${maxAge}; SameSite=Strict${secure}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function redirectAuthenticatedAdmin() {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (data.session?.user.app_metadata?.role === 'admin') {
        const user = data.session.user;
        persistAdminSession(data.session.access_token, {
          email: user.email ?? '',
          name: (user.user_metadata?.name as string) ?? user.email ?? '',
        }, remember);
        router.replace('/admin/dashboard');
      } else {
        removeToken();
        document.cookie = 'vja_admin_token=; path=/; max-age=0';
      }
    }

    void redirectAuthenticatedAdmin();
  }, [remember, router]);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.app_metadata?.role !== 'admin') return;
      persistAdminSession(session.access_token, {
        email: session.user.email ?? '',
        name: (session.user.user_metadata?.name as string) ?? session.user.email ?? '',
      }, remember);
    });
    return () => subscription.unsubscribe();
  }, [remember]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!supabase) {
        throw new Error('supabase_not_configured');
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (authError || !data.session) {
        throw new Error(authError?.message || 'invalid_credentials');
      }
      if (data.user.app_metadata?.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('not_admin');
      }
      const token = data.session.access_token;
      const user = { email: data.user.email ?? email, name: (data.user.user_metadata?.name as string) ?? email };

      persistAdminSession(token, user, remember);
      router.push('/admin/dashboard');
    } catch {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
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

          <div className="login-foot">
            Acceso restringido · Solo personal autorizado de Villar JA
          </div>
        </form>
      </div>
    </div>
  );
}
