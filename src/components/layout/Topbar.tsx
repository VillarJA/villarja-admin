'use client';

import { Icon } from '@/components/Icons';
import type { RouteId } from './Sidebar';

const TITLES: Record<string, string[]> = {
  dashboard:    ['Dashboard'],
  clientes:     ['Clientes'],
  cliente:      ['Clientes', 'Detalle'],
  facturas:     ['Emisión de Facturas'],
  contingencia: ['Contingencia'],
  planes:       ['Planes y Facturación'],
  configuracion:['Configuración'],
};

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
        <input placeholder="Buscar clientes, eNCF, RNC…" />
      </div>

      <div className="topbar-spacer" />

      <button className="icon-btn" title={dark ? 'Modo claro' : 'Modo oscuro'} onClick={onToggleDark}>
        <Icon name={dark ? 'sun' : 'moon'} />
      </button>

      <button className="icon-btn" title="Notificaciones" onClick={onNotification}>
        <Icon name="bell" />
        <span className="dot-ping" />
      </button>

      <button className="avatar">
        <span className="av-circle">VJ</span>
        <div className="av-meta">
          <b>Admin</b>
          <span>admin@villarja.com</span>
        </div>
      </button>

      <button className="icon-btn" title="Cerrar sesión" onClick={onLogout}>
        <Icon name="logout" />
      </button>
    </header>
  );
}
