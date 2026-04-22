// Hybrid bottom navbar: one button per workspace item that serves as
// BOTH the toggle and the draggable chip. Non-workspace items (profile,
// home, settings) live in a separate cluster — never draggable, never
// expanded into chips.
//
// States per workspace button:
//   resting       → icon only; colored dot if active
//   hover bar     → expands to icon + label + drag handle; dot stays
//   dragging      → chip lifted with ghost highlight
//
// Behaviors:
//   click  → toggle pane
//   drag   → reorder in open stack (and implicitly open if not yet)

const WS_ITEMS = [
  { k: 'library', I: Ic.Library,  l: 'Library',    dot: '#B5A27C' },
  { k: 'reader',  I: Ic.BookOpen, l: 'Reader',     dot: '#D97757' },
  { k: 'dict',    I: Ic.Search,   l: 'Dictionary', dot: '#4B7AA3' },
  { k: 'decks',   I: Ic.Cards,    l: 'Decks',      dot: '#8FB08A' },
  { k: 'study',   I: Ic.Sparkles, l: 'Study',      dot: '#C78A4F' },
];

const NON_WS = [
  { k: 'home',    I: Ic.Home,     l: 'Home' },
  { k: 'profile', I: Ic.User,     l: 'Profile' },
  { k: 'settings', I: Ic.Settings, l: 'Settings' },
];

// Single hybrid button — icon resting, expands with label on bar hover,
// shows drag handle when expanded, dot when active.
function HybridButton({ item, active, hoverBar, dragging, activeOrder }) {
  const dotIdx = active ? activeOrder : -1; // for ordering pip
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: hoverBar ? 6 : 0,
      padding: hoverBar ? '6px 10px 6px 7px' : '7px 7px',
      borderRadius: hoverBar ? 10 : 9,
      background: active ? 'var(--bg-sunken)' : 'transparent',
      border: active ? `1px solid ${item.dot}55` : '1px solid transparent',
      color: active ? 'var(--fg)' : 'var(--fg-muted)',
      cursor: hoverBar ? 'grab' : 'pointer',
      position: 'relative',
      opacity: dragging ? 0.4 : 1,
      outline: dragging ? `2px dashed ${item.dot}` : 'none',
      outlineOffset: 2,
      transition: 'padding 160ms, gap 160ms, border-radius 160ms',
      whiteSpace: 'nowrap',
    }}>
      {/* drag handle only on hover */}
      {hoverBar && (
        <span style={{ color: 'var(--fg-subtle)', fontSize: 10, letterSpacing: -1, fontFamily: 'ui-monospace, monospace', userSelect: 'none' }}>⋮⋮</span>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18 }}>
        <item.I size={16}/>
        {active && !hoverBar && (
          <span style={{ position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: 99, background: item.dot }}/>
        )}
      </div>
      {hoverBar && (
        <>
          <span style={{ fontSize: 11.5, fontWeight: active ? 600 : 500 }}>{item.l}</span>
          {active && <span style={{ width: 6, height: 6, borderRadius: 99, background: item.dot, marginLeft: 2 }}/>}
          {active && (
            <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 4, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg-subtle)', fontFamily: 'ui-monospace, monospace', marginLeft: 2 }}>{dotIdx + 1}</span>
          )}
        </>
      )}
    </div>
  );
}

// Non-workspace button — smaller, monochrome, no label expand, no drag
function PlainButton({ item, active }) {
  return (
    <div title={item.l} style={{
      width: 32, height: 32, borderRadius: 8,
      background: active ? 'var(--bg-sunken)' : 'transparent',
      color: active ? 'var(--fg)' : 'var(--fg-subtle)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer',
    }}>
      <item.I size={14}/>
    </div>
  );
}

// The bar itself. `hoverBar` expands ALL workspace buttons at once
// (bar-level hover, not per-button).
function HybridNav({ open = ['reader', 'dict'], hoverBar = false, dragKey = null, activeTab = 'profile', hideStudy = false }) {
  const wsItems = hideStudy ? WS_ITEMS.filter(i => i.k !== 'study') : WS_ITEMS;
  return (
    <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 30 }}>
      <div style={{
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(22px) saturate(170%)', WebkitBackdropFilter: 'blur(22px) saturate(170%)',
        border: '1px solid var(--border)', borderRadius: 16,
        boxShadow: '0 18px 48px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.06)',
        padding: 6, display: 'flex', alignItems: 'center', gap: 4,
        fontFamily: 'var(--font-ui)',
      }}>
        {/* Workspace items — ordered: open ones first (in `open` order), then unopened in default order */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {[...open.filter(k => wsItems.some(i => i.k === k)), ...wsItems.filter(i => !open.includes(i.k)).map(i => i.k)].map(k => {
            const item = wsItems.find(i => i.k === k);
            if (!item) return null;
            const active = open.includes(k);
            const order = open.indexOf(k);
            return (
              <HybridButton key={k} item={item} active={active} hoverBar={hoverBar} dragging={dragKey === k} activeOrder={order}/>
            );
          })}
        </div>
        <div style={{ width: 1, height: 26, background: 'var(--border)', margin: '0 4px' }}/>
        {/* Non-workspace — always compact icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {NON_WS.map(it => (
            <PlainButton key={it.k} item={it} active={activeTab === it.k}/>
          ))}
        </div>
      </div>
      {hoverBar && (
        <div style={{ position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--fg-subtle)', fontWeight: 600, whiteSpace: 'nowrap' }}>click to toggle · drag to reorder</div>
      )}
    </div>
  );
}

// Collapsed ball variant
function HybridBall() {
  return (
    <div style={{ position: 'absolute', bottom: 18, right: 20, zIndex: 30 }}>
      <button title="Open nav" style={{
        width: 52, height: 52, borderRadius: 99, background: 'var(--bg-elev)',
        border: '1px solid var(--border)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--fg)', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600,
        boxShadow: '0 10px 28px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.06)',
      }}>語</button>
    </div>
  );
}

Object.assign(window, { HybridNav, HybridBall });
