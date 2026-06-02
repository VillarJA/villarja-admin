/* Villar JA — App shell: sidebar, topbar, routing, tweaks */

const NAV = [
  { group: 'Operación', items: [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'clientes', label: 'Clientes', icon: 'clientes' },
    { id: 'facturas', label: 'Emisión e-CF', icon: 'factura' },
    { id: 'contingencia', label: 'Contingencia', icon: 'contingencia', badge: '18' },
  ]},
  { group: 'Administración', items: [
    { id: 'planes', label: 'Planes y Facturación', icon: 'planes' },
    { id: 'config', label: 'Configuración', icon: 'config' },
  ]},
];

const TITLES = {
  dashboard: ['Dashboard'],
  clientes: ['Clientes'],
  cliente: ['Clientes', 'Detalle'],
  facturas: ['Emisión de Facturas'],
  contingencia: ['Contingencia'],
  planes: ['Planes y Facturación'],
  config: ['Configuración'],
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": false,
  "accent": "#a60005",
  "density": "comfortable",
  "fontScale": 14
}/*EDITMODE-END*/;

function App() {
  const [authed, setAuthed] = React.useState(false);
  const [route, setRoute] = React.useState('dashboard');
  const [param, setParam] = React.useState(null);
  const [collapsed, setCollapsed] = React.useState(false);
  const [toastNode, toast] = useToast();
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // apply tweaks to :root
  React.useEffect(() => {
    const r = document.documentElement;
    r.setAttribute('data-theme', t.dark ? 'dark' : 'light');
    r.style.setProperty('--brand', t.accent);
    // derive darker shades
    r.style.setProperty('--fs', t.fontScale + 'px');
  }, [t.dark, t.accent, t.fontScale]);

  const go = (r, p = null) => { setRoute(r); setParam(p); document.querySelector('.content')?.scrollTo(0, 0); };

  if (!authed) {
    return <React.Fragment><Login onLogin={() => setAuthed(true)} />{renderPanel()}</React.Fragment>;
  }

  const compact = collapsed || t.density === 'compact';
  const crumb = TITLES[route] || ['Dashboard'];

  function renderScreen() {
    switch (route) {
      case 'dashboard': return <Dashboard go={go} toast={toast} />;
      case 'clientes': return <Clientes go={go} toast={toast} />;
      case 'cliente': return <ClienteDetalle id={param} go={go} toast={toast} />;
      case 'facturas': return <Facturas go={go} toast={toast} />;
      case 'contingencia': return <Contingencia toast={toast} />;
      case 'planes': return <Planes toast={toast} />;
      case 'config': return <Configuracion toast={toast} dark={t.dark} />;
      default: return <Dashboard go={go} toast={toast} />;
    }
  }

  function renderPanel() {
    return (
      <TweaksPanel>
        <TweakSection label="Tema" />
        <TweakToggle label="Modo oscuro" value={t.dark} onChange={v => setTweak('dark', v)} />
        <TweakColor label="Color de acento" value={t.accent}
          options={['#a60005', '#1a1a2e', '#2563c9', '#1f9d57', '#6b3fa0']}
          onChange={v => setTweak('accent', v)} />
        <TweakSection label="Diseño" />
        <TweakRadio label="Densidad sidebar" value={t.density} options={['comfortable', 'compact']}
          onChange={v => setTweak('density', v)} />
        <TweakSlider label="Tamaño de fuente" value={t.fontScale} min={12} max={17} step={1} unit="px"
          onChange={v => setTweak('fontScale', v)} />
      </TweaksPanel>
    );
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className={"sidebar" + (compact ? ' compact' : '')}>
        <div className="side-brand">
          <LogoMark size={36} />
          {!compact && (
            <div className="side-brand-text">
              <b>Villar JA</b>
              <span>Facturación e-CF</span>
            </div>
          )}
        </div>
        <nav className="side-nav">
          {NAV.map(g => (
            <div key={g.group}>
              <div className="side-group-label">{g.group}</div>
              {g.items.map(it => {
                const active = route === it.id || (it.id === 'clientes' && route === 'cliente');
                return (
                  <a key={it.id} className={"side-item" + (active ? ' active' : '')} onClick={() => go(it.id)} title={it.label}>
                    <Icon name={it.icon} />
                    <span>{it.label}</span>
                    {it.badge && <span className="side-badge">{it.badge}</span>}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <div className="side-status">
            <span className="dot" />
            <div>
              <b>DGII operativo</b>
              <span>4 de 5 servicios óptimos</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        <header className="topbar">
          <button className="topbar-toggle" onClick={() => setCollapsed(!collapsed)} title="Contraer menú"><Icon name="menu" /></button>
          <div className="breadcrumb">
            <span>Portal</span>
            {crumb.map((c, i) => (
              <React.Fragment key={i}>
                <span className="sep">/</span>
                {i === crumb.length - 1 ? <b>{c}</b> : <span>{c}</span>}
              </React.Fragment>
            ))}
          </div>
          <div className="topbar-search">
            <Icon name="search" />
            <input placeholder="Buscar clientes, eNCF, RNC…" />
          </div>
          <div className="topbar-spacer" />
          <button className="icon-btn" title="Notificaciones" onClick={() => toast('3 notificaciones nuevas')}>
            <Icon name="bell" /><span className="dot-ping" />
          </button>
          <button className="avatar" title="Cuenta admin">
            <span className="av-circle">VJ</span>
            <div className="av-meta">
              <b>Admin</b>
              <span>admin@villarja.com</span>
            </div>
          </button>
          <button className="icon-btn" title="Cerrar sesión" onClick={() => { setAuthed(false); go('dashboard'); }}><Icon name="logout" /></button>
        </header>

        <main className="content">
          {renderScreen()}
        </main>
      </div>

      {toastNode}
      {renderPanel()}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
