'use client';

import { useState } from 'react';
import { fmtNum } from '@/lib/data';
import type { DonutItem } from '@/types';

interface DonutChartProps {
  data: DonutItem[];
  size?: number;
}

export function DonutChart({ data, size = 168 }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = size / 2;
  const sw = 26;
  const r = R - sw / 2 - 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  const [hi, setHi] = useState<number | null>(null);

  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <g transform={`rotate(-90 ${R} ${R})`}>
          {data.map((d, i) => {
            const frac = d.value / total;
            const dash = frac * C;
            const off = acc * C;
            acc += frac;
            return (
              <circle
                key={i}
                cx={R} cy={R} r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={hi === i ? sw + 4 : sw}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-off}
                style={{ transition: 'stroke-width .15s', cursor: 'pointer' }}
                onMouseEnter={() => setHi(i)}
                onMouseLeave={() => setHi(null)}
              />
            );
          })}
        </g>
        <text x={R} y={R - 4} textAnchor="middle" fontSize="22" fontWeight="750" fill="var(--text)">
          {hi != null ? (data[hi].value / total * 100).toFixed(1) + '%' : (total / 1000).toFixed(0) + 'k'}
        </text>
        <text x={R} y={R + 15} textAnchor="middle" fontSize="11" fill="var(--text-muted)">
          {hi != null ? 'tipo ' + data[hi].tipo : 'total e-CF'}
        </text>
      </svg>
      <div className="donut-legend">
        {data.map((d, i) => (
          <div
            key={i}
            className="legend-item"
            onMouseEnter={() => setHi(i)}
            onMouseLeave={() => setHi(null)}
            style={{ opacity: hi == null || hi === i ? 1 : 0.45, cursor: 'pointer' }}
          >
            <span className="lk" style={{ background: d.color }} />
            <span className="ll">{d.label}</span>
            <span className="lv">{fmtNum(d.value)}</span>
            <span className="lp">{(d.value / total * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
