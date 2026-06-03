'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar, RouteId } from './Sidebar';
import { Topbar } from './Topbar';
import { useToast } from '@/components/ui/Toast';
import { removeToken } from '@/lib/auth';
import { getContingenciaQueue, getDGIIServices } from '@/lib/data-layer';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [toastNode, toast] = useToast();
  const [contingenciaBadge, setContingenciaBadge] = useState<number | undefined>(undefined);
  const [dgiiStatus, setDgiiStatus] = useState<{ ok: boolean; label: string } | undefined>(undefined);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    let cancelled = false;

    async function loadSidebarData() {
      try {
        const [queue, services] = await Promise.all([
          getContingenciaQueue(),
          getDGIIServices(),
        ]);
        if (cancelled) return;
        setContingenciaBadge(queue.length);
        const okCount = services.filter((s) => s.estado === 'ok').length;
        const allOk = okCount === services.length;
        setDgiiStatus({
          ok: allOk,
          label: services.length > 0
            ? `${okCount} de ${services.length} servicios óptimos`
            : 'Sin datos de conexión',
        });
      } catch {
        // non-critical — sidebar remains without badge
      }
    }

    loadSidebarData();
    return () => { cancelled = true; };
  }, []);

  const currentRoute = pathname.replace('/admin/', '').replace('/admin', '') || 'dashboard';

  const handleNavigate = useCallback((route: RouteId) => {
    router.push(`/admin/${route}`);
  }, [router]);

  const handleLogout = useCallback(() => {
    removeToken();
    document.cookie = 'vja_admin_token=; path=/; max-age=0';
    router.push('/login');
  }, [router]);

  const handleNotification = useCallback(() => {
    toast('Sin notificaciones nuevas en este momento');
  }, [toast]);

  return (
    <div className="app">
      <Sidebar
        route={currentRoute}
        compact={collapsed}
        onNavigate={handleNavigate}
        contingenciaBadge={contingenciaBadge}
        dgiiStatus={dgiiStatus}
      />
      <div className="main">
        <Topbar
          route={currentRoute}
          onToggleSidebar={() => setCollapsed((c) => !c)}
          onNotification={handleNotification}
          onLogout={handleLogout}
          dark={dark}
          onToggleDark={() => setDark((d) => !d)}
        />
        <main className="content">
          {children}
        </main>
      </div>
      {toastNode}
    </div>
  );
}
