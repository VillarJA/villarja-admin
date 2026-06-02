'use client';

interface SelectOption {
  v: string;
  l: string;
}

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: (string | SelectOption)[];
}

export function Select({ value, onChange, options }: SelectProps) {
  return (
    <div className="select-wrap">
      <select className="sel" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) =>
          typeof o === 'string' ? (
            <option key={o} value={o}>{o}</option>
          ) : (
            <option key={o.v} value={o.v}>{o.l}</option>
          )
        )}
      </select>
    </div>
  );
}
