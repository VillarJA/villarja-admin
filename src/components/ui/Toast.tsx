'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/Icons';

export function useToast(): [React.ReactNode, (msg: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2200);
    return () => clearTimeout(t);
  }, [msg]);

  const node = msg ? (
    <div className="toast">
      <Icon name="checkcircle" />
      {msg}
    </div>
  ) : null;

  return [node, setMsg];
}
