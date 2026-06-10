'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/Icons';
import { getStoredUser } from '@/lib/auth';

const TITLES: Record<string, string[]> = {
  dashboard:    ['Dashboard'],
  clientes:     ['Clientes'],
  cliente:      ['Clientes', 'Detalle'],
  facturas:     ['Emisión de Facturas'],
  contingencia: ['Contingencia'],
  planes:       ['Planes y Facturación'],
  configuracion:['Configuración'],
};

function getInitials(nameOrEmail: string): string {
  const parts = nameOrEmail.split(/[@\s]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nameOrEmail.slice(0, 2).toUpperCase();
}

interface TopbarProps {
  route: string;
  onToggleSidebar: () => void;
  onNotification: () => void;
  onLogout: () => void;
  dark: boolean;
  onToggleDark: () => void;
}

export function Topbar({ route, onToggleSidebar, onNotification, onLogout, dark, onToggleDark }: TopbarProps) {
  const crumb = TITLES[route] || ['Dashboard'];
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const displayName = user?.name && user.name !== user?.email ? user.name : (user?.email?.split('@')[0] ?? 'Admin');
  const displayEmail = user?.email ?? '';
  const initials = user ? getInitials(user.name || user.email) : 'VJ';

  return (
    <header className="topbar">
      <button className="topbar-toggle" onClick={onToggleSidebar} title="Contraer menú">
        <Icon name="menu" />
      </button>

      <div className="breadcrumb">
        <span>Portal</span>
        {crumb.map((c, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="sep">/</span>
            {i === crumb.length - 1 ? <b>{c}</b> : <span>{c}</span>}
          </span>
        ))}
      </div>

      <div className="topbar-search">
        <Icon name="search" />
        <input aria-label="Buscar clientes, eNCF, RNC" placeholder="Buscar clientes, eNCF, RNC…" />
      </div>

      <div className="topbar-spacer" />

      <button className="icon-btn" title={dark ? 'Modo claro' : 'Modo oscuro'} onClick={onToggleDark}>
        <Icon name={dark ? 'sun' : 'moon'} />
      </button>

      <button className="icon-btn" title="Notificaciones" onClick={onNotification}>
        <Icon name="bell" />
      </button>

      <button className="avatar" onClick={onNotification}>
        <span className="av-circle">{initials}</span>
        <div className="av-meta">
          <b>{displayName}</b>
          <span>{displayEmail}</span>
        </div>
      </button>

      <button className="icon-btn" title="Cerrar sesión" onClick={onLogout}>
        <Icon name="logout" />
      </button>
    </header>
  );
}
