'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar, RouteId } from './Sidebar';
import { Topbar } from './Topbar';
import { useToast } from '@/components/ui/Toast';
import { removeToken } from '@/lib/auth';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [toastNode, toast] = useToast();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const currentRoute = pathname.replace('/admin/', '').replace('/admin', '') || 'dashboard';

  const handleNavigate = useCallback((route: RouteId) => {
    router.push(`/admin/${route}`);
  }, [router]);

  const handleLogout = useCallback(() => {
    removeToken();
    document.cookie = 'vja_admin_token=; path=/; max-age=0';
    router.push('/login');
  }, [router]);

  return (
    <div className="app">
      <Sidebar
        route={currentRoute}
        compact={collapsed}
        onNavigate={handleNavigate}
      />
      <div className="main">
        <Topbar
          route={currentRoute}
          onToggleSidebar={() => setCollapsed((c) => !c)}
          onNotification={() => toast('3 notificaciones nuevas')}
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
