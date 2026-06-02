'use client';

import { markFor } from '@/lib/data';
import type { Company } from '@/types';

interface CoMarkProps {
  cliente: Company;
  size?: number;
}

export function CoMark({ cliente, size = 32 }: CoMarkProps) {
  const initials = cliente.razon
    .split(' ')
    .filter((w) => /^[A-Za-zÁÉÍÓÚÑ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <span
      className="co-mark"
      style={{
        background: markFor(cliente),
        width: size,
        height: size,
        fontSize: size * 0.36,
      }}
    >
      {initials}
    </span>
  );
}
