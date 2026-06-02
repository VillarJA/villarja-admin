/* Villar JA — shared UI primitives + charts */
const { useState, useEffect, useRef } = React;

function Badge({ cls, children }) {
  return <span className={"badge " + cls}><i className="bdot" />{children}</span>;
}
window.Badge = Badge;

function EstadoBadge({ estado }) {
  const m = window.ESTADO_MAP[estado] || { label: estado, cls: 'plain' };
  return <Badge cls={m.cls}>{m.label}</Badge>;
}
window.EstadoBadge = EstadoBadge;

function PlanPill({ plan }) {
  const cls = plan === 'Enterprise' ? 'enterprise' : plan === 'Pro' ? 'pro' : 'basico';
  return <span className={"plan-pill " + cls}>{plan}</span>;
}
window.PlanPill = PlanPill;

function CoMark({ cliente, size = 32 }) {
  const initials = cliente.razon.split(' ').filter(w => /^[A-Za-zÁÉÍÓÚÑ]/.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <span className="co-mark" style={{ background: window.markFor(cliente), width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </span>
  );
}
window.CoMark = CoMark;

function KPI({ icon, iconBg, iconColor, label, value, unit, delta, deltaNote, up }) {
  return (
    <div className="kpi">
      <div className="kpi-top">
        <div className="kpi-label">{label}</div>
        <div className="kpi-icon" style={{ background: iconBg, color: iconColor }}><Icon name={icon} /></div>
      </div>
      <div className="kpi-value">{value}{unit && <small> {unit}</small>}</div>
      {delta != null && (
        <div className={"kpi-delta " + (up ? 'up' : 'down')}>
          <Icon name={up ? 'arrowup' : 'arrowdown'} />{delta}
          {deltaNote && <span className="kpi-delta-note">{deltaNote}</span>}
        </div>
      )}
    </div>
  );
}
window.KPI = KPI;

/* ---- Line chart (30d) ---- */
function LineChart({ data, height = 230 }) {
  const W = 760, H = height, padL = 44, padR = 16, padT = 16, padB = 26;
  const max = Math.max(...data) * 1.12;
  const min = 0;
  const iw = W - padL - padR, ih = H - padT - padB;
  const x = i => padL + (i / (data.length - 1)) * iw;
  const y = v => padT + ih - ((v - min) / (max - min)) * ih;
  const pts = data.map((v, i) => [x(i), y(v)]);
  const linePath = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const areaPath = linePath + ` L${x(data.length - 1).toFixed(1)} ${(padT + ih)} L${padL} ${(padT + ih)} Z`;
  const yticks = 4;
  const labels = ['hace 30d', 'hace 20d', 'hace 10d', 'hoy'];
  const [hover, setHover] = useState(null);
  return (
    <svg className="chart-line" viewBox={`0 0 ${W} ${H}`} onMouseLeave={() => setHover(null)}
         onMouseMove={(e) => {
           const r = e.currentTarget.getBoundingClientRect();
           const mx = (e.clientX - r.left) / r.width * W;
           let idx = Math.round((mx - padL) / iw * (data.length - 1));
           idx = Math.max(0, Math.min(data.length - 1, idx));
           setHover(idx);
         }}>
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
            <text className="axis-t" x={padL - 8} y={yy + 3} textAnchor="end">{val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}</text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#lg)" />
      <path d={linePath} fill="none" stroke="var(--brand)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      {labels.map((l, i) => (
        <text key={l} className="axis-t" x={padL + (iw / 3) * i} y={H - 6} textAnchor={i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}>{l}</text>
      ))}
      {hover != null && (
        <g>
          <line x1={x(hover)} y1={padT} x2={x(hover)} y2={padT + ih} stroke="var(--brand)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
          <circle cx={x(hover)} cy={y(data[hover])} r="4.5" fill="var(--brand)" stroke="var(--surface)" strokeWidth="2" />
          <g transform={`translate(${Math.min(x(hover), W - 110)}, ${Math.max(y(data[hover]) - 42, 4)})`}>
            <rect width="104" height="32" rx="7" fill="var(--navy)" />
            <text x="10" y="14" fill="#fff" fontSize="11" fontWeight="700">{window.fmtNum(data[hover])} e-CF</text>
            <text x="10" y="26" fill="#9092a8" fontSize="9.5">día {hover + 1} de 30</text>
          </g>
        </g>
      )}
    </svg>
  );
}
window.LineChart = LineChart;

/* ---- Donut chart ---- */
function Donut({ data, size = 168 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = size / 2, sw = 26, r = R - sw / 2 - 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  const [hi, setHi] = useState(null);
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
              <circle key={i} cx={R} cy={R} r={r} fill="none" stroke={d.color}
                strokeWidth={hi === i ? sw + 4 : sw} strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-off} style={{ transition: 'stroke-width .15s', cursor: 'pointer' }}
                onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} />
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
          <div className="legend-item" key={i} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} style={{ opacity: hi == null || hi === i ? 1 : 0.45, cursor: 'pointer' }}>
            <span className="lk" style={{ background: d.color }} />
            <span className="ll">{d.label}</span>
            <span className="lv">{window.fmtNum(d.value)}</span>
            <span className="lp">{(d.value / total * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
window.Donut = Donut;

/* ---- Mini sparkline ---- */
function Spark({ data, color = 'var(--brand)', w = 90, h = 30 }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / (max - min || 1)) * (h - 4) - 2]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return <svg width={w} height={h} style={{ display: 'block' }}><path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
window.Spark = Spark;

/* ---- Pagination ---- */
function Pagination({ page, pageSize, total, onPage }) {
  const pages = Math.ceil(total / pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const nums = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <div className="pagination">
      <span className="pinfo">Mostrando <b>{from}–{to}</b> de <b>{window.fmtNum(total)}</b></span>
      <div className="pages">
        <button disabled={page === 1} onClick={() => onPage(page - 1)}><Icon name="chevleft" style={{ width: 14, height: 14 }} /></button>
        {nums.map((n, i) => n === '…'
          ? <button key={'e' + i} disabled style={{ border: 'none', background: 'none' }}>…</button>
          : <button key={n} className={n === page ? 'on' : ''} onClick={() => onPage(n)}>{n}</button>)}
        <button disabled={page === pages} onClick={() => onPage(page + 1)}><Icon name="chevright" style={{ width: 14, height: 14 }} /></button>
      </div>
    </div>
  );
}
window.Pagination = Pagination;

/* ---- Toast ---- */
function useToast() {
  const [msg, setMsg] = useState(null);
  const show = (m) => { setMsg(m); };
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 2200); return () => clearTimeout(t); } }, [msg]);
  const node = msg ? <div className="toast"><Icon name="checkcircle" />{msg}</div> : null;
  return [node, show];
}
window.useToast = useToast;

/* ---- Select ---- */
function Select({ value, onChange, options }) {
  return (
    <div className="select-wrap">
      <select className="sel" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
window.Select = Select;
