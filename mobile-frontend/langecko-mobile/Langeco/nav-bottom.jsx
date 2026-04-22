// Four horizontal bottom-center navbar variants. All live as floating
// glass-ish pills at the bottom of the viewport. All expose the same
// behaviors: nav icons toggle panes, open panes appear as draggable
// chips, collapse → ball.

const NAV_ITEMS = [
  { k: 'home',    I: Ic.Home,     l: 'Home',       dot: '#8A8886' },
  { k: 'library', I: Ic.Library,  l: 'Library',    dot: '#B5A27C' },
  { k: 'reader',  I: Ic.BookOpen, l: 'Reader',     dot: '#D97757' },
  { k: 'dict',    I: Ic.Search,   l: 'Dictionary', dot: '#4B7AA3' },
  { k: 'decks',   I: Ic.Cards,    l: 'Decks',      dot: '#8FB08A' },
  { k: 'study',   I: Ic.Sparkles, l: 'Study',      dot: '#C78A4F' },
  { k: 'profile', I: Ic.User,     l: 'Profile',    dot: '#9B8CAF' },
];

// Shared workspace behind the nav (reuses PreviewPane from nav-explorations)
function BottomWS({ open = ['reader', 'dict'], children }) {
  return (
    <div className="theme-default" style={{ width: '100%', height: '100%', background: 'var(--bg)', position: 'relative', overflow: 'hidden', display: 'flex' }}>
      {open.map((k, i) => <PreviewPane key={i} paneKey={k} flex={k === 'reader' ? 2 : 1}/>)}
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// B1 · SEGMENTED DOCK — nav | divider | panes | divider | actions
// Icons-only resting; hover grows pill vertically adding labels under
// each icon. Drag chips to reorder. Close X on each chip.
// ════════════════════════════════════════════════════════════════════
function B1({ hover = false, open = ['reader', 'dict'], dragIdx = -1 }) {
  return (
    <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 30 }}>
      <div style={{
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(22px) saturate(170%)', WebkitBackdropFilter: 'blur(22px) saturate(170%)',
        border: '1px solid var(--border)', borderRadius: 16,
        boxShadow: '0 18px 48px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.06)',
        padding: 6, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {NAV_ITEMS.map(it => {
            const active = open.includes(it.k);
            return (
              <div key={it.k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div title={it.l} style={{
                  width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? 'var(--bg-sunken)' : 'transparent',
                  border: active ? `1px solid ${it.dot}66` : '1px solid transparent',
                  color: active ? 'var(--fg)' : 'var(--fg-muted)', cursor: 'pointer', position: 'relative',
                }}>
                  <it.I size={16}/>
                  {active && <span style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: 99, background: it.dot }}/>}
                </div>
                {hover && <span style={{ fontSize: 9, color: active ? 'var(--fg)' : 'var(--fg-subtle)', fontWeight: active ? 600 : 500 }}>{it.l}</span>}
              </div>
            );
          })}
        </div>
        <div style={{ width: 1, height: 26, background: 'var(--border)' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {open.map((k, i) => {
            const it = NAV_ITEMS.find(n => n.k === k);
            return (
              <React.Fragment key={k}>
                {i > 0 && <span style={{ color: 'var(--fg-subtle)', fontSize: 10 }}>⇄</span>}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 99,
                  background: 'var(--bg-sunken)', border: '1px solid var(--border)',
                  opacity: dragIdx === i ? 0.45 : 1, cursor: 'grab',
                  outline: dragIdx === i ? '2px dashed var(--accent)' : 'none',
                }}>
                  <span style={{ color: 'var(--fg-subtle)', fontSize: 9 }}>⋮⋮</span>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: it.dot }}/>
                  <span style={{ fontSize: 11.5, fontWeight: 500 }}>{it.l}</span>
                  <Ic.X size={10}/>
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <div style={{ width: 1, height: 26, background: 'var(--border)' }}/>
        <button title="Layouts" style={{ width: 32, height: 32, border: 'none', background: 'transparent', borderRadius: 7, color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic.List size={13}/></button>
        <button title="Collapse" style={{ width: 32, height: 32, border: 'none', background: 'transparent', borderRadius: 7, color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic.ChevronDown size={13}/></button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// B2 · TWO-TIER STACK — small chips row on top of icon row
// Open-pane chips float as a compact row ABOVE the main icon dock,
// connected by a subtle tail. Clear separation between nav (bottom,
// permanent) and open panes (top, transient).
// ════════════════════════════════════════════════════════════════════
function B2({ hover = false, open = ['reader', 'dict'], dragIdx = -1 }) {
  return (
    <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {open.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          border: '1px solid var(--border)', borderRadius: 99,
          padding: '4px 6px', display: 'flex', alignItems: 'center', gap: 3,
          boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
        }}>
          <span style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-subtle)', fontWeight: 700, padding: '0 6px' }}>Open</span>
          {open.map((k, i) => {
            const it = NAV_ITEMS.find(n => n.k === k);
            return (
              <React.Fragment key={k}>
                {i > 0 && <span style={{ color: 'var(--fg-subtle)', fontSize: 9 }}>⇄</span>}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99,
                  background: 'var(--bg-sunken)', border: '1px solid var(--border)',
                  opacity: dragIdx === i ? 0.45 : 1, cursor: 'grab',
                  outline: dragIdx === i ? '2px dashed var(--accent)' : 'none',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: 99, background: it.dot }}/>
                  <span style={{ fontSize: 10.5, fontWeight: 500 }}>{it.l}</span>
                  <Ic.X size={9}/>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
      {/* main icon dock */}
      <div style={{
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(22px) saturate(170%)', WebkitBackdropFilter: 'blur(22px) saturate(170%)',
        border: '1px solid var(--border)', borderRadius: 18,
        boxShadow: '0 18px 48px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.06)',
        padding: 6, display: 'flex', alignItems: 'center', gap: 2,
      }}>
        {NAV_ITEMS.map(it => {
          const active = open.includes(it.k);
          return (
            <div key={it.k} title={it.l} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: hover ? '6px 12px' : '7px 9px', borderRadius: 12,
              background: active ? 'var(--bg-sunken)' : 'transparent',
              color: active ? 'var(--fg)' : 'var(--fg-muted)', cursor: 'pointer', position: 'relative',
              gap: 2, transition: 'padding 140ms',
            }}>
              <it.I size={16}/>
              {hover && <span style={{ fontSize: 9, fontWeight: active ? 600 : 500, marginTop: 1 }}>{it.l}</span>}
              {active && !hover && <span style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: 99, background: it.dot }}/>}
              {active && hover && <span style={{ position: 'absolute', top: 2, right: 4, width: 5, height: 5, borderRadius: 99, background: it.dot }}/>}
            </div>
          );
        })}
        <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }}/>
        <button title="Collapse" style={{ width: 34, height: 34, border: 'none', background: 'transparent', borderRadius: 9, color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic.ChevronDown size={13}/></button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// B3 · MAGNIFY DOCK (macOS-flavored)
// Always-label mode. Hover magnifies the hovered icon + neighbors.
// Chips hang off the right edge of the dock in a rounded pocket.
// ════════════════════════════════════════════════════════════════════
function B3({ hoverIdx = -1, open = ['reader', 'dict'], dragIdx = -1 }) {
  return (
    <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 30 }}>
      <div style={{
        background: 'rgba(245,243,240,0.94)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid var(--border)', borderRadius: 20,
        boxShadow: '0 20px 56px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)',
        padding: '10px 14px', display: 'flex', alignItems: 'flex-end', gap: 2,
      }}>
        {NAV_ITEMS.map((it, i) => {
          const active = open.includes(it.k);
          const dist = hoverIdx >= 0 ? Math.abs(i - hoverIdx) : 99;
          const scale = dist === 0 ? 1.55 : dist === 1 ? 1.25 : dist === 2 ? 1.08 : 1;
          const size = Math.round(40 * scale);
          return (
            <div key={it.k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, transition: 'all 180ms' }}>
              <div title={it.l} style={{
                width: size, height: size, borderRadius: Math.round(10 * scale),
                background: active ? 'var(--bg-elev)' : 'rgba(255,255,255,0.5)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: active ? 'var(--fg)' : 'var(--fg-muted)', cursor: 'pointer',
                boxShadow: scale > 1.1 ? '0 8px 20px rgba(0,0,0,0.14)' : '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'all 180ms',
              }}>
                <it.I size={Math.round(17 * Math.min(scale, 1.35))}/>
              </div>
              <span style={{ fontSize: 9, color: active ? 'var(--fg)' : 'var(--fg-subtle)', fontWeight: active ? 700 : 500, opacity: dist === 0 ? 1 : 0.7 }}>{it.l}</span>
              {active && <span style={{ width: 4, height: 4, borderRadius: 99, background: it.dot, marginTop: -2 }}/>}
            </div>
          );
        })}
        <div style={{ width: 1, height: 46, background: 'var(--border)', margin: '0 8px 20px' }}/>
        {/* chip pocket */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 18 }}>
          <span style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-subtle)', fontWeight: 700 }}>Open</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {open.map((k, i) => {
              const it = NAV_ITEMS.find(n => n.k === k);
              return (
                <React.Fragment key={k}>
                  {i > 0 && <span style={{ color: 'var(--fg-subtle)', fontSize: 9, alignSelf: 'center' }}>⇄</span>}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 99,
                    background: 'var(--bg-elev)', border: '1px solid var(--border)',
                    opacity: dragIdx === i ? 0.45 : 1, cursor: 'grab',
                    outline: dragIdx === i ? '2px dashed var(--accent)' : 'none',
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: 99, background: it.dot }}/>
                    <span style={{ fontSize: 10.5, fontWeight: 500 }}>{it.l}</span>
                    <Ic.X size={9}/>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// B4 · COMMAND BAR (Raycast-flavored)
// Single rounded-rectangle bar, all text labels, nav items separated
// by small dividers. Open panes appear as outlined chips inside the
// same bar after a prominent divider. Very typographic. Hover glows
// the hovered item. Command-K hint on the right.
// ════════════════════════════════════════════════════════════════════
function B4({ hoverIdx = -1, open = ['reader', 'dict'], dragIdx = -1 }) {
  return (
    <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 30 }}>
      <div style={{
        background: 'rgba(28,24,22,0.92)', backdropFilter: 'blur(22px) saturate(170%)', WebkitBackdropFilter: 'blur(22px) saturate(170%)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
        boxShadow: '0 22px 56px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.2)',
        padding: '6px', display: 'flex', alignItems: 'center', gap: 2, color: 'white',
        fontFamily: 'var(--font-ui)',
      }}>
        <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, marginRight: 6 }}>語</div>
        {NAV_ITEMS.map((it, i) => {
          const active = open.includes(it.k);
          const hovered = i === hoverIdx;
          return (
            <React.Fragment key={it.k}>
              {i > 0 && <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, padding: '0 2px' }}>·</span>}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 7,
                background: hovered ? 'rgba(255,255,255,0.08)' : (active ? 'rgba(255,255,255,0.05)' : 'transparent'),
                color: active ? 'white' : 'rgba(255,255,255,0.6)', cursor: 'pointer', position: 'relative',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: 99, background: active ? it.dot : 'transparent', border: active ? 'none' : '1px solid rgba(255,255,255,0.25)', flexShrink: 0 }}/>
                <it.I size={13}/>
                <span style={{ fontSize: 12, fontWeight: active ? 600 : 500, letterSpacing: 0.1 }}>{it.l}</span>
              </div>
            </React.Fragment>
          );
        })}
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }}/>
        {open.map((k, i) => {
          const it = NAV_ITEMS.find(n => n.k === k);
          return (
            <React.Fragment key={k}>
              {i > 0 && <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>⇄</span>}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 99,
                background: 'rgba(255,255,255,0.08)', border: `1px solid ${it.dot}55`,
                opacity: dragIdx === i ? 0.45 : 1, cursor: 'grab',
                outline: dragIdx === i ? '2px dashed rgba(217,119,87,0.7)' : 'none',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: 99, background: it.dot }}/>
                <span style={{ fontSize: 11, fontWeight: 500 }}>{it.l}</span>
                <Ic.X size={9}/>
              </div>
            </React.Fragment>
          );
        })}
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)', margin: '0 6px' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}>
          <kbd style={{ padding: '1px 5px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, fontSize: 9 }}>⌘</kbd>
          <kbd style={{ padding: '1px 5px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, fontSize: 9 }}>K</kbd>
        </div>
      </div>
    </div>
  );
}

// Ball (shared collapsed state — always bottom-right)
function NavBall() {
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

Object.assign(window, { B1, B2, B3, B4, NavBall, BottomWS });
