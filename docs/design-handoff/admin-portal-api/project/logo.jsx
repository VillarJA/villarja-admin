/* Villar JA — logo components (preload real URL, graceful monogram fallback) */
const LOGO_URL = 'https://villarja.com/assets/img/logo-villarja.png';

// Preload once; components subscribe to the result so a broken image never flashes.
const LogoState = { status: 'loading', listeners: new Set() };
(function preload() {
  const img = new Image();
  img.onload = () => { LogoState.status = (img.naturalWidth > 0) ? 'ok' : 'fail'; LogoState.listeners.forEach(f => f()); };
  img.onerror = () => { LogoState.status = 'fail'; LogoState.listeners.forEach(f => f()); };
  img.src = LOGO_URL;
})();

function useLogo() {
  const [, force] = React.useState(0);
  React.useEffect(() => {
    if (LogoState.status !== 'loading') return;
    const f = () => force(x => x + 1);
    LogoState.listeners.add(f);
    return () => LogoState.listeners.delete(f);
  }, []);
  return LogoState.status;
}

function LogoMark({ size = 36 }) {
  const st = useLogo();
  if (st === 'ok') {
    return (
      <span className="side-logo-mark" style={{ width: size, height: size, padding: size * 0.13, background: '#fff' }}>
        <img src={LOGO_URL} alt="Villar JA" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </span>
    );
  }
  return <span className="side-logo-mark" style={{ width: size, height: size, fontSize: size * 0.4 }}>VJ</span>;
}
window.LogoMark = LogoMark;

function LogoFull() {
  const st = useLogo();
  if (st === 'ok') {
    return <img src={LOGO_URL} alt="Villar JA Data y Tecnología" style={{ height: 52, width: 'auto' }} />;
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span className="side-logo-mark" style={{ width: 46, height: 46, fontSize: 19 }}>VJ</span>
      <div style={{ lineHeight: 1.15 }}>
        <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: '-0.5px', color: 'var(--text)' }}>Villar JA</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>DATA Y TECNOLOGÍA</div>
      </div>
    </div>
  );
}
window.LogoFull = LogoFull;
