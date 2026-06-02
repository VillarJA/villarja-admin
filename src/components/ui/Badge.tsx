'use client';

import React from 'react';
import { ESTADO_MAP } from '@/lib/data';

interface BadgeProps {
  cls: string;
  children: React.ReactNode;
}

export function Badge({ cls, children }: BadgeProps) {
  return (
    <span className={`badge ${cls}`}>
      <i className="bdot" />
      {children}
    </span>
  );
}

export function EstadoBadge({ estado }: { estado: string }) {
  const m = ESTADO_MAP[estado] || { label: estado, cls: 'plain' };
  return <Badge cls={m.cls}>{m.label}</Badge>;
}

export function PlanPill({ plan }: { plan: string }) {
  const cls = plan === 'Enterprise' ? 'enterprise' : plan === 'Pro' ? 'pro' : 'basico';
  return <span className={`plan-pill ${cls}`}>{plan}</span>;
}
