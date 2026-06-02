'use client';

import { Icon } from '@/components/Icons';
import { fmtNum } from '@/lib/data';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}

export function Pagination({ page, pageSize, total, onPage }: PaginationProps) {
  const pages = Math.ceil(total / pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const nums: (number | '…')[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) {
      nums.push(i);
    } else if (nums[nums.length - 1] !== '…') {
      nums.push('…');
    }
  }

  return (
    <div className="pagination">
      <span className="pinfo">
        Mostrando <b>{from}–{to}</b> de <b>{fmtNum(total)}</b>
      </span>
      <div className="pages">
        <button disabled={page === 1} onClick={() => onPage(page - 1)}>
          <Icon name="chevleft" style={{ width: 14, height: 14 }} />
        </button>
        {nums.map((n, i) =>
          n === '…' ? (
            <button key={`e${i}`} disabled style={{ border: 'none', background: 'none' }}>…</button>
          ) : (
            <button key={n} className={n === page ? 'on' : ''} onClick={() => onPage(n as number)}>
              {n}
            </button>
          )
        )}
        <button disabled={page === pages} onClick={() => onPage(page + 1)}>
          <Icon name="chevright" style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}
