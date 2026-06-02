'use client';

import { Icon } from '@/components/Icons';
import { LogoMark } from './Logo';

export type RouteId = 'dashboard' | 'clientes' | 'facturas' | 'contingencia' | 'planes' | 'configuracion';

const NAV: {
  group: string;
  items: { id: RouteId; label: string; icon: string; badge?: string; disabled?: boolean }[];
}[] = [
  {
    group: 'General',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    ],
  },
  {
    group: 'Facturación Electrónica',
    items: [
      { id: 'clientes',     label: 'Clientes',     icon: 'clientes' },
      { id: 'facturas',     label: 'Emisión e-CF', icon: 'factura' },
      { id: 'contingencia', label: 'Contingencia', icon: 'contingencia', badge: '18' },
      { id: 'planes',       label: 'Planes',       icon: 'planes' },
    ],
  },
];

const COMING_SOON = [
  { label: 'FluxyMed', icon: 'activity' },
  { label: 'FluxyGo',  icon: 'trending' },
];

interface SidebarProps {
  route: string;
  compact: boolean;
  onNavigate: (r: RouteId) => void;
}

export function Sidebar({ route, compact, onNavigate }: SidebarProps) {
  return (
    <aside className={`sidebar${compact ? ' compact' : ''}`}>
      <div className="side-brand">
        <LogoMark size={36} />
        {!compact && (
          <div className="side-brand-text">
            <b>Villar JA</b>
            <span>Facturación e-CF</span>
          </div>
        )}
      </div>

      <nav className="side-nav">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="side-group-label">{g.group}</div>
            {g.items.map((it) => {
              const active = route === it.id || (it.id === 'clientes' && route === 'cliente');
              return (
                <div
                  key={it.id}
                  className={`side-item${active ? ' active' : ''}`}
                  onClick={() => onNavigate(it.id)}
                  title={it.label}
                >
                  <Icon name={it.icon} />
                  <span>{it.label}</span>
                  {it.badge && <span className="side-badge">{it.badge}</span>}
                </div>
              );
            })}
          </div>
        ))}

        {/* Coming soon modules */}
        {COMING_SOON.map((m) => (
          <div key={m.label}>
            <div className="side-group-label">{m.label}</div>
            <div className="side-item disabled" title={`${m.label} (Próximamente)`}>
              <Icon name={m.icon} />
              <span>{m.label}</span>
              {!compact && (
                <span style={{
                  marginLeft: 'auto', fontSize: 9.5, fontWeight: 700, padding: '2px 7px',
                  borderRadius: 20, background: 'rgba(255,255,255,0.08)', color: 'var(--side-text-dim)',
                }}>
                  Próximamente
                </span>
              )}
            </div>
          </div>
        ))}
      </nav>

      <div className="side-foot">
        <div className="side-status">
          <span className="dot" />
          {!compact && (
            <div>
              <b>DGII operativo</b>
              <span>4 de 5 servicios óptimos</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
