// Three exploratory nav/pane-bar approaches. Each merges the modular left
// icon-rail with the top pane-bar into ONE unified surface.
//
// Shared contract for all three:
//  - Icon list collapsed by default → hover-expands showing labels
//  - Clicking an icon TOGGLES that pane in the workspace (never a separate
//    route; the app is modular-only)
//  - Active / open panes are draggable to reorder (tab-bar feel)
//  - Whole rail can collapse into a small floating ball; clicking re-expands
//
// All three are shown here in isolation + composed into a workspace preview.

const NAV_ITEMS = [
  { k: 'home',    I: Ic.Home,     l: 'Home',        dot: '#8A8886' },
  { k: 'library', I: Ic.Library,  l: 'Library',     dot: '#B5A27C' },
  { k: 'reader',  I: Ic.BookOpen, l: 'Reader',      dot: '#D97757' },
  { k: 'dict',    I: Ic.Search,   l: 'Dictionary',  dot: '#4B7AA3' },
  { k: 'decks',   I: Ic.Cards,    l: 'Decks',       dot: '#8FB08A' },
  { k: 'study',   I: Ic.Sparkles, l: 'Study',       dot: '#C78A4F' },
  { k: 'profile', I: Ic.User,     l: 'Profile',     dot: '#9B8CAF' },
];

// ════════════════════════════════════════════════════════════════════
// VARIANT 1 · DOCK RAIL
// Vertical rail on the left. Resting width = 52. On hover → 192 with
// labels. Active panes get the pane-chip treatment (color dot + drag
// grip). Inactive nav items are just icons. Collapse button at bottom
// turns the whole rail into a floating 44px ball.
// ════════════════════════════════════════════════════════════════════

function NavDockRail({ expanded = false, open = ['reader', 'dict'], dragIdx = -1, asBall = false }) {
  if (asBall) {
    return (
      <div style={{
        width: 52, background: 'var(--bg-sunken)', borderRight: '1px solid var(--border)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 12,
      }}>
        <button title="Expand" style={{
          width: 40, height: 40, borderRadius: 99, background: 'var(--bg-elev)',
          border: '1px solid var(--border)', boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          color: 'var(--fg)', fontFamily: 'var(--font-display)', fontWeight: 600,
        }}>語</button>
      </div>
    );
  }
  const w = expanded ? 212 : 56;
  return (
    <div style={{
      width: w, flexShrink: 0, background: 'var(--bg-sunken)',
      borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      padding: '10px 8px', transition: 'width 160ms ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px 14px' }}>
        <div style={{ width: 30, height: 30, background: 'var(--accent)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600 }}>語</div>
        {expanded && <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 500 }}>Langeco</div>}
      </div>
      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-subtle)', fontWeight: 600, padding: expanded ? '8px 8px 4px' : '8px 0 4px', textAlign: expanded ? 'left' : 'center' }}>
        {expanded ? 'Open' : '·'}
      </div>
      {open.map((k, i) => {
        const it = NAV_ITEMS.find(n => n.k === k);
        return (
          <div key={k} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: expanded ? '7px 10px' : '8px', borderRadius: 7, margin: '1px 0',
            background: 'var(--bg-elev)', border: '1px solid var(--border)', color: 'var(--fg)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            opacity: dragIdx === i ? 0.45 : 1, cursor: 'grab',
            justifyContent: expanded ? 'flex-start' : 'center', position: 'relative',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: it.dot, flexShrink: 0 }}/>
            <it.I size={14}/>
            {expanded && <span style={{ fontSize: 12.5, fontWeight: 500, flex: 1 }}>{it.l}</span>}
            {expanded && <span style={{ color: 'var(--fg-subtle)', fontSize: 11, letterSpacing: 1 }}>⋮⋮</span>}
            {!expanded && <span style={{ position: 'absolute', top: 4, right: 4, width: 4, height: 4, borderRadius: 99, background: 'var(--accent)' }}/>}
          </div>
        );
      })}
      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-subtle)', fontWeight: 600, padding: expanded ? '12px 8px 4px' : '12px 0 4px', textAlign: expanded ? 'left' : 'center' }}>
        {expanded ? 'Add' : '+'}
      </div>
      {NAV_ITEMS.filter(n => !open.includes(n.k)).map(it => (
        <div key={it.k} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: expanded ? '7px 10px' : '8px', borderRadius: 7, margin: '1px 0',
          color: 'var(--fg-muted)', cursor: 'pointer', justifyContent: expanded ? 'flex-start' : 'center',
        }}>
          <it.I size={14}/>
          {expanded && <span style={{ fontSize: 12.5, flex: 1 }}>{it.l}</span>}
          {expanded && <Ic.Plus size={11}/>}
        </div>
      ))}
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: expanded ? '4px 8px' : '4px 0', justifyContent: expanded ? 'flex-start' : 'center' }}>
          <div style={{ width: 24, height: 24, borderRadius: 99, background: 'linear-gradient(135deg, var(--accent), #8E3B36)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white', fontFamily: 'var(--font-display)' }}>波</div>
          {expanded && <span style={{ fontSize: 12 }}>Lucas</span>}
          {expanded && <button title="Collapse" style={{ marginLeft: 'auto', width: 22, height: 22, border: 'none', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic.ChevronLeft size={13}/></button>}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// VARIANT 2 · TOP BAR (pane-bar + nav fused)
// A single horizontal bar across the top. Left: logo + all nav icons
// (collapsed circles). Middle/right: open panes as draggable chips
// (the current top pane-bar, absorbed). On hover the icons expand
// sideways to show labels. Collapse → ball docks top-right.
// ════════════════════════════════════════════════════════════════════

function NavTopBar({ hover = false, open = ['reader', 'dict'], dragIdx = -1, asBall = false }) {
  if (asBall) {
    return (
      <div style={{ height: 48, borderBottom: '1px solid var(--border)', background: 'var(--bg-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 14px' }}>
        <button title="Expand nav" style={{
          width: 36, height: 36, borderRadius: 99, background: 'var(--bg-elev)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          color: 'var(--fg)', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600,
          boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
        }}>語</button>
      </div>
    );
  }
  return (
    <div style={{ height: hover ? 52 : 44, borderBottom: '1px solid var(--border)', background: 'var(--bg-sunken)', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 10, transition: 'height 160ms' }}>
      {/* logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 10, borderRight: '1px solid var(--border)', height: '100%' }}>
        <div style={{ width: 26, height: 26, background: 'var(--accent)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600 }}>語</div>
      </div>
      {/* nav icon cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        {NAV_ITEMS.map(it => {
          const active = open.includes(it.k);
          return (
            <div key={it.k} title={it.l} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: hover ? '5px 10px' : '5px 7px', borderRadius: 6,
              background: active ? 'var(--bg-elev)' : 'transparent',
              border: active ? '1px solid var(--border)' : '1px solid transparent',
              color: active ? 'var(--fg)' : 'var(--fg-muted)', cursor: 'pointer',
              transition: 'padding 160ms',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: 99, background: active ? it.dot : 'transparent', flexShrink: 0 }}/>
              <it.I size={13}/>
              {hover && <span style={{ fontSize: 11.5, fontWeight: active ? 600 : 400 }}>{it.l}</span>}
            </div>
          );
        })}
      </div>
      {/* divider */}
      <div style={{ width: 1, height: 22, background: 'var(--border)' }}/>
      {/* open panes as draggable chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, overflow: 'hidden' }}>
        <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-subtle)', fontWeight: 600, marginRight: 4 }}>Open</span>
        {open.map((k, i) => {
          const it = NAV_ITEMS.find(n => n.k === k);
          return (
            <React.Fragment key={k}>
              {i > 0 && <span style={{ color: 'var(--fg-subtle)', fontSize: 10 }}>⇄</span>}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99,
                background: 'var(--bg-elev)', border: '1px solid var(--border)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                opacity: dragIdx === i ? 0.45 : 1, cursor: 'grab',
                outline: dragIdx === i ? '2px dashed var(--accent)' : 'none',
              }}>
                <span style={{ color: 'var(--fg-subtle)', fontSize: 10, letterSpacing: 0.5 }}>⋮⋮</span>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: it.dot }}/>
                <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--fg)' }}>{it.l}</span>
                <Ic.X size={10}/>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <button title="Layouts" style={{ width: 28, height: 28, border: '1px solid var(--border)', background: 'var(--bg-elev)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--fg-muted)' }}>
        <Ic.List size={12}/>
      </button>
      <button title="Collapse" style={{ width: 28, height: 28, border: '1px solid var(--border)', background: 'var(--bg-elev)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--fg-muted)' }}>
        <Ic.Minus size={12}/>
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// VARIANT 3 · FLOATING PILL
// A floating pill anchored bottom-center (like a command bar). Always
// visible as a compact horizontal capsule with logo + dotted nav icons
// + open-pane chips. On hover the pill expands vertically, revealing
// labels stacked under each section. Collapses to a single ball that
// floats in the bottom-right corner. The canvas behind is empty chrome
// → feels like a Spotlight / iPadOS control center.
// ════════════════════════════════════════════════════════════════════

function NavFloatingPill({ hover = false, open = ['reader', 'dict'], dragIdx = -1, asBall = false }) {
  if (asBall) {
    return (
      <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 20 }}>
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
  return (
    <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
      <div style={{
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px) saturate(170%)', WebkitBackdropFilter: 'blur(20px) saturate(170%)',
        border: '1px solid var(--border)', borderRadius: 18,
        boxShadow: '0 18px 48px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.06)',
        padding: hover ? '10px 10px 8px' : '8px 8px', display: 'flex', flexDirection: 'column', gap: 6,
        transition: 'padding 160ms',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>語</div>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }}/>
          {/* nav icons */}
          <div style={{ display: 'flex', gap: 2 }}>
            {NAV_ITEMS.map(it => {
              const active = open.includes(it.k);
              return (
                <div key={it.k} title={it.l} style={{
                  width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? 'var(--bg-sunken)' : 'transparent',
                  border: active ? `1px solid ${it.dot}66` : '1px solid transparent',
                  color: active ? 'var(--fg)' : 'var(--fg-muted)', cursor: 'pointer', position: 'relative',
                }}>
                  <it.I size={15}/>
                  {active && <span style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: 99, background: it.dot }}/>}
                </div>
              );
            })}
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }}/>
          {/* open pane chips */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {open.map((k, i) => {
              const it = NAV_ITEMS.find(n => n.k === k);
              return (
                <React.Fragment key={k}>
                  {i > 0 && <span style={{ color: 'var(--fg-subtle)', fontSize: 10 }}>⇄</span>}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 99,
                    background: 'var(--bg-sunken)', border: '1px solid var(--border)',
                    opacity: dragIdx === i ? 0.45 : 1, cursor: 'grab',
                    outline: dragIdx === i ? '2px dashed var(--accent)' : 'none',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: it.dot }}/>
                    <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--fg)' }}>{it.l}</span>
                    <Ic.X size={9}/>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }}/>
          <button title="Collapse to ball" style={{ width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 6, color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ic.ChevronDown size={13}/>
          </button>
        </div>
        {hover && (
          <div style={{ display: 'flex', gap: 2, paddingLeft: 44, fontSize: 9, color: 'var(--fg-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
            {NAV_ITEMS.map(it => (
              <div key={it.k} style={{ width: 34, textAlign: 'center' }}>{it.l.slice(0, 4)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Minimal pane stand-ins (reuse from modular but simpler, for preview)
// ─────────────────────────────────────────────────────────────────
function PreviewPane({ paneKey, flex = 1 }) {
  const it = NAV_ITEMS.find(n => n.k === paneKey);
  const content = {
    reader: (
      <div style={{ padding: '24px 32px', fontFamily: 'var(--font-reader)', fontSize: 15, lineHeight: 2, color: 'var(--fg)' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 16 }}>上・一 · 鎌倉の海</div>
        <p style={{ margin: '0 0 14px' }}>私はその人を常に先生と呼んでいた。だからここでもただ先生と書くだけで本名は打ち明けない。</p>
        <p style={{ margin: '0 0 14px' }}>これは世間を憚かる遠慮というよりも、その方が私にとって自然だからである。</p>
        <p style={{ margin: 0 }}>私が先生と知り合いになったのは<mark style={{ background: 'var(--accent-soft)', padding: '0 2px', color: 'var(--fg)' }}>鎌倉</mark>である。</p>
      </div>
    ),
    dict: (
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 500 }}>鎌倉</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>かまくら</div>
        </div>
        <div style={{ fontSize: 9, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginTop: 10, marginBottom: 4 }}>Meaning</div>
        <ol style={{ margin: 0, padding: '0 0 0 18px', fontSize: 12, lineHeight: 1.5, color: 'var(--fg)' }}>
          <li>Kamakura — coastal city in Kanagawa Prefecture.</li>
          <li style={{ marginTop: 4 }}>Kamakura period (1185–1333).</li>
        </ol>
        <button style={{ marginTop: 14, width: '100%', padding: '7px 10px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>+ Flashcard</button>
      </div>
    ),
    decks: (
      <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[{ n: 'Kokoro Ch.1', k: '心', c: 42 }, { n: 'N2 Grammar', k: '文', c: 180 }, { n: 'Miyazawa K.', k: '銀', c: 96 }, { n: 'Daily Kanji', k: '漢', c: 28 }].map((d, i) => (
          <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ height: 48, background: `linear-gradient(135deg, #6B5A45, #2a1e14)`, display: 'flex', alignItems: 'flex-end', padding: 8, color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-display)', fontSize: 20, lineHeight: 1 }}>{d.k}</div>
            <div style={{ padding: 8 }}>
              <div style={{ fontSize: 11.5, fontWeight: 500 }}>{d.n}</div>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{d.c} cards</div>
            </div>
          </div>
        ))}
      </div>
    ),
  }[paneKey] || <div style={{ padding: 20, color: 'var(--fg-muted)', fontSize: 13 }}>{it.l} pane</div>;
  return (
    <div style={{ flex, minWidth: 0, height: '100%', background: 'var(--bg-elev)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, background: 'var(--bg-sunken)' }}>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: it.dot }}/>
        <it.I size={12}/>
        <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{it.l}</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>{content}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Workspace previews (nav composed with 2 panes)
// ════════════════════════════════════════════════════════════════════

function WS_DockRail({ expanded = false, open = ['reader', 'dict'], asBall = false, dragIdx = -1 }) {
  return (
    <div className="theme-default" style={{ width: '100%', height: '100%', display: 'flex', background: 'var(--bg)', overflow: 'hidden' }}>
      <NavDockRail expanded={expanded} open={open} asBall={asBall} dragIdx={dragIdx}/>
      <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
        {open.map((k, i) => <PreviewPane key={i} paneKey={k} flex={k === 'reader' ? 2 : 1}/>)}
      </div>
    </div>
  );
}

function WS_TopBar({ hover = false, open = ['reader', 'dict'], asBall = false, dragIdx = -1 }) {
  return (
    <div className="theme-default" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      <NavTopBar hover={hover} open={open} asBall={asBall} dragIdx={dragIdx}/>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {open.map((k, i) => <PreviewPane key={i} paneKey={k} flex={k === 'reader' ? 2 : 1}/>)}
      </div>
    </div>
  );
}

function WS_FloatingPill({ hover = false, open = ['reader', 'dict'], asBall = false, dragIdx = -1 }) {
  return (
    <div className="theme-default" style={{ width: '100%', height: '100%', background: 'var(--bg)', position: 'relative', overflow: 'hidden', display: 'flex' }}>
      {open.map((k, i) => <PreviewPane key={i} paneKey={k} flex={k === 'reader' ? 2 : 1}/>)}
      <NavFloatingPill hover={hover} open={open} asBall={asBall} dragIdx={dragIdx}/>
    </div>
  );
}

Object.assign(window, {
  NavDockRail, NavTopBar, NavFloatingPill,
  WS_DockRail, WS_TopBar, WS_FloatingPill,
});
