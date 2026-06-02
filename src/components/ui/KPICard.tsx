'use client';

import { Icon } from '@/components/Icons';

interface KPICardProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaNote?: string;
  up?: boolean;
}

export function KPICard({ icon, iconBg, iconColor, label, value, unit, delta, deltaNote, up }: KPICardProps) {
  return (
    <div className="kpi">
      <div className="kpi-top">
        <div className="kpi-label">{label}</div>
        <div className="kpi-icon" style={{ background: iconBg, color: iconColor }}>
          <Icon name={icon} />
        </div>
      </div>
      <div className="kpi-value">
        {value}
        {unit && <small> {unit}</small>}
      </div>
      {delta != null && (
        <div className={`kpi-delta ${up ? 'up' : 'down'}`}>
          <Icon name={up ? 'arrowup' : 'arrowdown'} />
          {delta}
          {deltaNote && <span className="kpi-delta-note">{deltaNote}</span>}
        </div>
      )}
    </div>
  );
}
