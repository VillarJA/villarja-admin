'use client';

import { useState, useRef } from 'react';
import { fmtNum } from '@/lib/data';

interface LineChartProps {
  data: number[];
  height?: number;
}

export function LineChart({ data, height = 230 }: LineChartProps) {
  const W = 760, H = height, padL = 44, padR = 16, padT = 16, padB = 26;
  const max = Math.max(...data) * 1.12;
  const min = 0;
  const iw = W - padL - padR;
  const ih = H - padT - padB;

  const x = (i: number) => padL + (i / (data.length - 1)) * iw;
  const y = (v: number) => padT + ih - ((v - min) / (max - min)) * ih;

  const pts = data.map((v, i) => [x(i), y(v)]);
  const linePath = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const areaPath = linePath + ` L${x(data.length - 1).toFixed(1)} ${(padT + ih)} L${padL} ${(padT + ih)} Z`;

  const yticks = 4;
  const labels = ['hace 30d', 'hace 20d', 'hace 10d', 'hoy'];
  const [hover, setHover] = useState<number | null>(null);
  const rectRef = useRef<DOMRect | null>(null);

  return (
    <svg
      className="chart-line"
      viewBox={`0 0 ${W} ${H}`}
      onMouseEnter={(e) => { rectRef.current = e.currentTarget.getBoundingClientRect(); }}
      onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => {
        const r = rectRef.current;
        if (!r) return;
        const mx = ((e.clientX - r.left) / r.width) * W;
        let idx = Math.round(((mx - padL) / iw) * (data.length - 1));
        idx = Math.max(0, Math.min(data.length - 1, idx));
        setHover(idx);
      }}
    >
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: yticks + 1 }).map((_, i) => {
        const yy = padT + (ih / yticks) * i;
        const val = Math.round(max - (max / yticks) * i);
        return (
          <g key={i}>
            <line className="grid-l" x1={padL} y1={yy} x2={W - padR} y2={yy} />
            <text className="axis-t" x={padL - 8} y={yy + 3} textAnchor="end">
              {val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#lg)" />
      <path d={linePath} fill="none" stroke="var(--brand)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      {labels.map((l, i) => (
        <text
          key={l}
          className="axis-t"
          x={padL + (iw / 3) * i}
          y={H - 6}
          textAnchor={i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}
        >
          {l}
        </text>
      ))}
      {hover != null && (
        <g>
          <line
            x1={x(hover)} y1={padT} x2={x(hover)} y2={padT + ih}
            stroke="var(--brand)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5"
          />
          <circle cx={x(hover)} cy={y(data[hover])} r="4.5" fill="var(--brand)" stroke="var(--surface)" strokeWidth="2" />
          <g transform={`translate(${Math.min(x(hover), W - 110)}, ${Math.max(y(data[hover]) - 42, 4)})`}>
            <rect width="104" height="32" rx="7" fill="var(--navy)" />
            <text x="10" y="14" fill="var(--side-text)" fontSize="11" fontWeight="700">{fmtNum(data[hover])} e-CF</text>
            <text x="10" y="26" fill="var(--side-text-dim)" fontSize="9.5">día {hover + 1} de 30</text>
          </g>
        </g>
      )}
    </svg>
  );
}
