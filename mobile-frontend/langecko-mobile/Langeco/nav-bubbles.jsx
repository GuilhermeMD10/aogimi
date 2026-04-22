// Three ways a non-workspace item (Profile) opens as a floating bubble
// anchored to its navbar button. Each dismisses by tap-outside. Shown
// over a live 2-pane workspace so you can judge scrim/fit.

const USER = {
  name: 'Pedro Carvalho',
  handle: '@pedro',
  email: 'pedro@ceiia.com',
  streak: 14,
  level: 'N4 · reading',
  words: 847,
  studied: 2340,
};

// Shared scrim — very faint; close-on-tap-anywhere feel without the
// heavy-handed dim of a modal.
function SoftScrim({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 35,
      background: 'rgba(20,16,12,0.04)',
      backdropFilter: 'blur(1.5px)', WebkitBackdropFilter: 'blur(1.5px)',
      cursor: 'default',
    }}/>
  );
}

// Stripped-down hybrid bar that accepts an `open` highlight — so we can
// show Profile button visibly "pressed" under each popover treatment.
// Matches Langeco Hybrid Nav exactly.
function NavInBubble({ openPanes = ['reader', 'dict'], openTab = null, onTab }) {
  const wsItems = [
    { k: 'library', I: Ic.Library,  l: 'Library',    dot: '#B5A27C' },
    { k: 'reader',  I: Ic.BookOpen, l: 'Reader',     dot: '#D97757' },
    { k: 'dict',    I: Ic.Search,   l: 'Dictionary', dot: '#4B7AA3' },
    { k: 'decks',   I: Ic.Cards,    l: 'Decks',      dot: '#8FB08A' },
    { k: 'study',   I: Ic.Sparkles, l: 'Study',      dot: '#C78A4F' },
  ];
  const nonWs = [
    { k: 'home',    I: Ic.Home,     l: 'Home' },
    { k: 'profile', I: Ic.User,     l: 'Profile' },
    { k: 'settings', I: Ic.Settings, l: 'Settings' },
  ];
  return (
    <div style={{
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(22px) saturate(170%)', WebkitBackdropFilter: 'blur(22px) saturate(170%)',
      border: '1px solid var(--border)', borderRadius: 16,
      boxShadow: '0 18px 48px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.06)',
      padding: 6, display: 'flex', alignItems: 'center', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        {wsItems.map(item => {
          const active = openPanes.includes(item.k);
          return (
            <div key={item.k} style={{
              padding: '7px 7px', borderRadius: 9,
              background: active ? 'var(--bg-sunken)' : 'transparent',
              border: active ? `1px solid ${item.dot}55` : '1px solid transparent',
              color: active ? 'var(--fg)' : 'var(--fg-muted)', cursor: 'pointer', position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
            }}>
              <item.I size={16}/>
              {active && <span style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: 99, background: item.dot }}/>}
            </div>
          );
        })}
      </div>
      <div style={{ width: 1, height: 26, background: 'var(--border)', margin: '0 4px' }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {nonWs.map(item => {
          const active = openTab === item.k;
          return (
            <div key={item.k} id={`navbtn-${item.k}`} onClick={() => onTab && onTab(item.k)} title={item.l} style={{
              width: 32, height: 32, borderRadius: 8,
              background: active ? 'var(--fg)' : 'transparent',
              color: active ? 'var(--bg-elev)' : 'var(--fg-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 160ms',
            }}>
              <item.I size={14}/>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Shared workspace backdrop
function BubbleWS({ children }) {
  return (
    <div className="theme-default" style={{ width: '100%', height: '100%', background: 'var(--bg)', position: 'relative', overflow: 'hidden', display: 'flex' }}>
      <PreviewPane paneKey="reader" flex={2}/>
      <PreviewPane paneKey="dict" flex={1}/>
      {children}
    </div>
  );
}

// Reusable profile guts — list-style compact
function ProfileStats() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, background: 'var(--border)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
      {[
        { label: 'Streak', value: USER.streak, suffix: 'd' },
        { label: 'Words', value: USER.words },
        { label: 'Studied', value: USER.studied },
      ].map(s => (
        <div key={s.label} style={{ background: 'var(--bg-elev)', padding: '10px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--fg)' }}>{s.value}{s.suffix && <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 2 }}>{s.suffix}</span>}</div>
          <div style={{ fontSize: 9.5, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function ProfileRowList() {
  const rows = [
    { I: Ic.User,     l: 'Account & profile' },
    { I: Ic.Cards,    l: 'My decks',  tail: '3' },
    { I: Ic.Bookmark, l: 'Saved highlights', tail: '24' },
    { I: Ic.Settings, l: 'Preferences' },
    { I: Ic.Moon,     l: 'Appearance' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {rows.map((r, i) => (
        <div key={i} style={{
          padding: '9px 10px', display: 'flex', alignItems: 'center', gap: 10,
          borderTop: i > 0 ? '1px solid var(--border)' : 'none',
          cursor: 'pointer', color: 'var(--fg)',
        }}>
          <r.I size={14} stroke={1.6}/>
          <span style={{ flex: 1, fontSize: 12.5 }}>{r.l}</span>
          {r.tail && <span style={{ fontSize: 10, color: 'var(--fg-subtle)', fontFamily: 'ui-monospace, monospace' }}>{r.tail}</span>}
          <Ic.ChevronRight size={12} stroke={1.5}/>
        </div>
      ))}
    </div>
  );
}

// Identity header (avatar + name)
function ProfileIdent({ compact = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: compact ? 36 : 44, height: compact ? 36 : 44, borderRadius: 99, background: 'linear-gradient(135deg, #D97757, #A8455E)', color: 'white', fontFamily: 'var(--font-display)', fontSize: compact ? 15 : 18, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 10px rgba(217,119,87,0.3)' }}>P</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: compact ? 13 : 14.5, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.2 }}>{USER.name}</div>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2, fontFamily: 'ui-monospace, monospace' }}>{USER.handle}</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// V1 · ANCHORED POPOVER
// Compact card hovering directly above Profile button, with a tiny
// tail pointing down at the button. Tight, card-sized. Like a menu.
// ════════════════════════════════════════════════════════════════════
function V1_AnchoredPopover() {
  // Profile is the middle non-ws; bar centers at screen → profile sits
  // slightly right of bar center. Hand-placed offsets here.
  return (
    <>
      <SoftScrim/>
      {/* popover */}
      <div style={{
        position: 'absolute', bottom: 88, left: '50%', transform: 'translateX(calc(-50% + 102px))',
        zIndex: 40, width: 280,
        background: 'var(--bg-elev)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        boxShadow: '0 24px 56px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        fontFamily: 'var(--font-ui)',
      }}>
        {/* tail */}
        <div style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: 12, height: 12, background: 'var(--bg-elev)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', zIndex: -1 }}/>
        <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
          <ProfileIdent compact/>
        </div>
        <div style={{ padding: '10px 14px 12px', borderBottom: '1px solid var(--border)' }}>
          <ProfileStats/>
        </div>
        <div style={{ padding: 4 }}>
          <ProfileRowList/>
        </div>
        <div style={{ padding: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
          <button style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 11.5, color: 'var(--fg)', cursor: 'pointer' }}>Full profile</button>
          <button style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 11.5, color: 'var(--fg-muted)', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// V2 · RISING SHEET
// Wider panel — roughly the width of a workspace pane — rising above
// the navbar. Not full-screen. Still feels temporary. Tap outside = close.
// Layout is richer: left column = identity + stats, right = actions.
// ════════════════════════════════════════════════════════════════════
function V2_RisingSheet() {
  return (
    <>
      <SoftScrim/>
      <div style={{
        position: 'absolute', bottom: 82, left: '50%', transform: 'translateX(-50%)',
        zIndex: 40, width: 520,
        background: 'var(--bg-elev)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        boxShadow: '0 28px 68px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        fontFamily: 'var(--font-ui)',
        display: 'flex',
      }}>
        {/* Left: identity + stats */}
        <div style={{ flex: 1, padding: 20, borderRight: '1px solid var(--border)', background: 'var(--bg-sunken)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ProfileIdent/>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
            <div style={{ marginBottom: 4 }}><span style={{ color: 'var(--fg-subtle)' }}>Email · </span>{USER.email}</div>
            <div><span style={{ color: 'var(--fg-subtle)' }}>Level · </span>{USER.level}</div>
          </div>
          <ProfileStats/>
          <div style={{ flex: 1 }}/>
          <button style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elev)', fontSize: 12, color: 'var(--fg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ic.User size={12}/> Open full profile
          </button>
        </div>
        {/* Right: quick actions */}
        <div style={{ width: 220, padding: 8, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-subtle)', fontWeight: 700, padding: '8px 10px 4px' }}>Quick actions</div>
          <ProfileRowList/>
          <div style={{ flex: 1 }}/>
          <button style={{ padding: '9px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', fontSize: 11.5, color: 'var(--fg-muted)', cursor: 'pointer', margin: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ic.ArrowLeft size={11}/> Sign out
          </button>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// V3 · ORBITING STACK
// A small identity chip rises directly, and action bubbles fan upward
// in a staggered column to the right/left. Super lightweight; feels like
// quick-actions. Shows streak as a visible ring around the avatar.
// ════════════════════════════════════════════════════════════════════
function V3_OrbitingStack() {
  const quickActions = [
    { I: Ic.Cards,    l: 'My decks',    sub: '3 decks · 182 cards' },
    { I: Ic.Bookmark, l: 'Highlights',  sub: '24 saved' },
    { I: Ic.Moon,     l: 'Appearance',  sub: 'Default · light' },
    { I: Ic.Settings, l: 'Preferences', sub: 'Audio · reader · sync' },
  ];
  return (
    <>
      <SoftScrim/>
      {/* Identity chip — anchored above profile */}
      <div style={{
        position: 'absolute', bottom: 88, left: '50%', transform: 'translateX(calc(-50% + 102px))',
        zIndex: 42,
        background: 'var(--bg-elev)',
        border: '1px solid var(--border)',
        borderRadius: 99,
        boxShadow: '0 18px 44px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
        padding: '8px 14px 8px 8px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {/* streak ring */}
        <div style={{ position: 'relative', width: 42, height: 42 }}>
          <svg width="42" height="42" style={{ position: 'absolute', inset: 0 }}>
            <circle cx="21" cy="21" r="19" fill="none" stroke="var(--border)" strokeWidth="2"/>
            <circle cx="21" cy="21" r="19" fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray={`${(14/30)*119} 200`} strokeLinecap="round" transform="rotate(-90 21 21)"/>
          </svg>
          <div style={{ position: 'absolute', inset: 3, borderRadius: 99, background: 'linear-gradient(135deg, #D97757, #A8455E)', color: 'white', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>P</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.1 }}>{USER.name}</div>
          <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', marginTop: 2, fontFamily: 'ui-monospace, monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{USER.handle}</span>
            <span style={{ color: 'var(--accent)' }}>· 🔥 {USER.streak}d</span>
          </div>
        </div>
        <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 2px' }}/>
        <button style={{ padding: '4px 10px', borderRadius: 99, border: 'none', background: 'var(--bg)', fontSize: 10.5, color: 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'ui-monospace, monospace' }}>Sign out</button>
      </div>

      {/* Action bubbles — fan up and slightly right from the button, stacked */}
      <div style={{
        position: 'absolute', bottom: 148, left: '50%', transform: 'translateX(calc(-50% + 102px + 30px))',
        zIndex: 41, display: 'flex', flexDirection: 'column-reverse', gap: 8, alignItems: 'flex-start',
      }}>
        {quickActions.map((a, i) => (
          <div key={i} style={{
            background: 'var(--bg-elev)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 14px 36px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.06)',
            padding: '8px 14px 8px 10px',
            display: 'flex', alignItems: 'center', gap: 10,
            transform: `translateX(${i * 8}px)`,
            cursor: 'pointer', minWidth: 220,
          }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)' }}>
              <a.I size={13}/>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.1 }}>{a.l}</div>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 2 }}>{a.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

Object.assign(window, { NavInBubble, BubbleWS, V1_AnchoredPopover, V2_RisingSheet, V3_OrbitingStack });
