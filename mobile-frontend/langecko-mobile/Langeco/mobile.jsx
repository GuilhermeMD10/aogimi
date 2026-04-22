// Langeco Mobile — native iOS-style components
// All designs use Default theme only. Architect for theme-switching via CSS vars later.

const M = {
  bg: '#FAFAF9',
  bgElev: '#FFFFFF',
  bgSunken: '#F2F1EE',
  fg: '#1A1918',
  fgMuted: '#6B6966',
  fgSubtle: '#A8A5A0',
  border: 'rgba(26, 25, 24, 0.08)',
  borderStrong: 'rgba(26, 25, 24, 0.14)',
  accent: '#1A1918',
  accentSoft: 'rgba(26, 25, 24, 0.06)',
  highlight: '#F5E3A9',
  success: '#3B7A40',
  fontUI: '-apple-system, "SF Pro Text", system-ui, sans-serif',
  fontDisplay: '-apple-system, "SF Pro Display", system-ui, sans-serif',
  fontJP: '"Hiragino Mincho ProN", "Shippori Mincho", "Noto Serif JP", serif',
  fontJPSans: '"Hiragino Sans", "Noto Sans JP", system-ui, sans-serif',
};

const MOBILE_W = 402;
const MOBILE_H = 874;

// ───────────── Primitives ─────────────

function StatusBar({ time = '9:41' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '19px 30px 6px', fontFamily: M.fontUI, fontSize: 16, fontWeight: 600,
      color: M.fg, position: 'relative', zIndex: 20,
    }}>
      <span>{time}</span>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="0.5" fill={M.fg}/><rect x="4.5" y="5" width="3" height="6" rx="0.5" fill={M.fg}/><rect x="9" y="2.5" width="3" height="8.5" rx="0.5" fill={M.fg}/><rect x="13.5" y="0" width="3" height="11" rx="0.5" fill={M.fg}/></svg>
        <svg width="15" height="11" viewBox="0 0 15 11"><path d="M7.5 3c1.9 0 3.7.7 5 2l1-1c-1.6-1.5-3.7-2.5-6-2.5s-4.4 1-6 2.5l1 1c1.3-1.3 3.1-2 5-2z" fill={M.fg}/><circle cx="7.5" cy="9.5" r="1.3" fill={M.fg}/></svg>
        <svg width="24" height="11" viewBox="0 0 24 11"><rect x="0.5" y="0.5" width="21" height="10" rx="3" stroke={M.fg} strokeOpacity="0.4" fill="none"/><rect x="2" y="2" width="17" height="7" rx="1.5" fill={M.fg}/></svg>
      </div>
    </div>
  );
}

function HomeIndicator({ light = false }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 34, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 8, pointerEvents: 'none', zIndex: 60 }}>
      <div style={{ width: 139, height: 5, borderRadius: 100, background: light ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.22)' }}/>
    </div>
  );
}

function Device({ children, label, w = MOBILE_W, h = MOBILE_H, bg = M.bg, note }) {
  return (
    <DCArtboard width={w + 36} height={h + 36} label={label}>
      <div style={{ padding: 18, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: w, height: h, borderRadius: 48, overflow: 'hidden', position: 'relative',
          background: bg, boxShadow: '0 30px 60px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.1)',
          fontFamily: M.fontUI,
        }}>
          <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 120, height: 35, borderRadius: 24, background: '#000', zIndex: 50 }}/>
          {children}
          {note && <div style={{ position: 'absolute', bottom: 48, left: 12, background: 'rgba(0,0,0,0.78)', color: 'white', fontSize: 10, padding: '4px 8px', borderRadius: 6, fontFamily: 'ui-monospace, monospace', zIndex: 70 }}>{note}</div>}
        </div>
      </div>
    </DCArtboard>
  );
}

// Tab bar (5 tabs)
function TabBar({ active = 'library' }) {
  const tabs = [
    { k: 'library', I: Ic.Library, l: 'Library' },
    { k: 'reader', I: Ic.BookOpen, l: 'Reader' },
    { k: 'dict', I: Ic.Search, l: 'Dictionary' },
    { k: 'decks', I: Ic.Cards, l: 'Decks' },
    { k: 'profile', I: Ic.User, l: 'You' },
  ];
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40 }}>
      <div style={{
        background: 'rgba(250, 250, 249, 0.82)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        borderTop: `0.5px solid ${M.border}`,
        padding: '8px 8px 28px', display: 'flex',
      }}>
        {tabs.map(t => {
          const on = t.k === active;
          return (
            <div key={t.k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: on ? M.fg : M.fgSubtle }}>
              <t.I size={22} stroke={on ? 2.1 : 1.7}/>
              <span style={{ fontSize: 10, fontWeight: on ? 600 : 500, letterSpacing: 0.1 }}>{t.l}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Page shell with nav bar (large title)
function PageShell({ title, leading, trailing, children, active, scrollable = true, contentPad = true, flush = false }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: M.bg, position: 'relative' }}>
      <StatusBar/>
      {(leading || trailing || title) && (
        <div style={{ padding: '2px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 }}>
          <div style={{ color: M.fg }}>{leading}</div>
          <div style={{ color: M.fg, display: 'flex', gap: 10 }}>{trailing}</div>
        </div>
      )}
      {title && (
        <div style={{ padding: flush ? '6px 20px 14px' : '6px 20px 18px', fontFamily: M.fontDisplay, fontSize: 32, fontWeight: 700, letterSpacing: -0.5, color: M.fg }}>
          {title}
        </div>
      )}
      <div style={{ flex: 1, overflow: scrollable ? 'auto' : 'hidden', padding: contentPad ? '0 20px 100px' : '0 0 100px' }}>
        {children}
      </div>
      {active && <TabBar active={active}/>}
      <HomeIndicator/>
    </div>
  );
}

// Small building blocks
function Pill({ children, icon, style = {} }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
      borderRadius: 999, background: M.bgElev, border: `0.5px solid ${M.border}`,
      fontSize: 13, color: M.fg, fontWeight: 500, ...style,
    }}>
      {icon}
      {children}
    </div>
  );
}

function IconCircle({ children, bg = M.bgElev, size = 36 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 999, background: bg, border: `0.5px solid ${M.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: M.fg }}>
      {children}
    </div>
  );
}

function PrimaryButton({ children, full, style }) {
  return (
    <button style={{
      padding: '16px 24px', background: M.accent, color: 'white', border: 'none', borderRadius: 999,
      fontFamily: M.fontUI, fontSize: 15, fontWeight: 600, cursor: 'pointer', letterSpacing: -0.1,
      width: full ? '100%' : undefined, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      ...style,
    }}>{children}</button>
  );
}

function SecondaryButton({ children, full, style }) {
  return (
    <button style={{
      padding: '15px 24px', background: M.bgElev, color: M.fg, border: `0.5px solid ${M.borderStrong}`, borderRadius: 999,
      fontFamily: M.fontUI, fontSize: 15, fontWeight: 500, cursor: 'pointer',
      width: full ? '100%' : undefined, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      ...style,
    }}>{children}</button>
  );
}

function Card({ children, style = {}, pad = 16 }) {
  return (
    <div style={{ background: M.bgElev, borderRadius: 16, padding: pad, border: `0.5px solid ${M.border}`, ...style }}>
      {children}
    </div>
  );
}

// ───────────── SCREENS ─────────────

// Auth — Welcome / Signup
function MobileWelcome() {
  return (
    <PageShell contentPad={false}>
      <div style={{ flex: 1, padding: '40px 28px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginTop: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: M.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: M.fontJP, fontSize: 32, fontWeight: 500 }}>語</div>
          <div style={{ fontFamily: M.fontDisplay, fontSize: 44, fontWeight: 700, letterSpacing: -1, marginTop: 44, color: M.fg, lineHeight: 1.05 }}>
            Read Japanese<br/>with confidence.
          </div>
          <div style={{ fontSize: 16, color: M.fgMuted, marginTop: 14, lineHeight: 1.45 }}>
            Tap any word to see its meaning, save it to flashcards, and study in context.
          </div>
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PrimaryButton full>Create account</PrimaryButton>
          <SecondaryButton full>Sign in</SecondaryButton>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <SecondaryButton full style={{ fontSize: 13 }}><Ic.Globe size={14}/> Google</SecondaryButton>
            <SecondaryButton full style={{ fontSize: 13 }}>Apple</SecondaryButton>
          </div>
        </div>
      </div>
      <HomeIndicator/>
    </PageShell>
  );
}

function MobileSignup() {
  return (
    <PageShell
      leading={<div style={{ fontSize: 15, fontWeight: 500, color: M.fgMuted }}>Back</div>}
      title="Create account"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { l: 'Username', p: '@yourname' },
          { l: 'Password', p: '••••••••', trail: <Ic.Eye size={16}/> },
          { l: 'Confirm password', p: '••••••••', trail: <Ic.Eye size={16}/> },
        ].map(f => (
          <div key={f.l}>
            <div style={{ fontSize: 12, color: M.fgMuted, padding: '0 4px 6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.6 }}>{f.l}</div>
            <div style={{ background: M.bgElev, borderRadius: 14, padding: '15px 18px', border: `0.5px solid ${M.border}`, fontSize: 16, color: M.fg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: M.fgSubtle }}>{f.p}</span>
              {f.trail}
            </div>
          </div>
        ))}
        <PrimaryButton full style={{ marginTop: 20 }}>Create account</PrimaryButton>
        <div style={{ textAlign: 'center', fontSize: 13, color: M.fgMuted, padding: 8 }}>
          or continue with
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <SecondaryButton full>Google</SecondaryButton>
          <SecondaryButton full>Apple</SecondaryButton>
        </div>
      </div>
    </PageShell>
  );
}

// Library
function MobileLibrary() {
  const books = [
    { t: 'こゝろ', a: '夏目漱石', p: 42, cg: '#6B5A45', g: '心' },
    { t: '銀河鉄道の夜', a: '宮沢賢治', p: 18, cg: '#263B5C', g: '銀' },
    { t: '走れメロス', a: '太宰治', p: 67, cg: '#8E3B36', g: '走' },
    { t: '雪国', a: '川端康成', p: 8, cg: '#45566B', g: '雪' },
  ];
  return (
    <PageShell
      trailing={<IconCircle><Ic.Plus size={18}/></IconCircle>}
      title="Library"
      active="library"
    >
      <div style={{ marginBottom: 22 }}>
        <Card pad={18}>
          <div style={{ fontSize: 12, color: M.fgMuted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>Continue reading</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 10, alignItems: 'center' }}>
            <div style={{ width: 64, height: 88, borderRadius: 8, background: `linear-gradient(135deg, ${books[0].cg}, #000)`, display: 'flex', alignItems: 'flex-end', padding: 6, color: 'rgba(255,255,255,0.9)', fontFamily: M.fontJP, fontSize: 28, lineHeight: 1 }}>{books[0].g}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: M.fontJP, fontSize: 20, fontWeight: 500, color: M.fg }}>{books[0].t}</div>
              <div style={{ fontSize: 13, color: M.fgMuted, marginTop: 2 }}>{books[0].a}</div>
              <div style={{ height: 3, borderRadius: 99, background: M.bgSunken, marginTop: 10, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, right: `${100 - books[0].p}%`, background: M.fg, borderRadius: 99 }}/>
              </div>
              <div style={{ fontSize: 11, color: M.fgSubtle, marginTop: 5, fontFamily: 'ui-monospace, monospace' }}>{books[0].p}% · last read 2h ago</div>
            </div>
          </div>
        </Card>
      </div>
      <div style={{ fontSize: 13, color: M.fgMuted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, marginBottom: 12, padding: '0 4px' }}>Your library</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {books.map(b => (
          <div key={b.t} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ aspectRatio: '3/4', borderRadius: 10, background: `linear-gradient(135deg, ${b.cg}, color-mix(in oklab, ${b.cg} 35%, black))`, display: 'flex', alignItems: 'flex-end', padding: 10, color: 'rgba(255,255,255,0.92)', fontFamily: M.fontJP, fontSize: 38, lineHeight: 1, boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>{b.g}</div>
            <div style={{ fontFamily: M.fontJP, fontSize: 14, fontWeight: 500, color: M.fg, marginTop: 8, lineHeight: 1.3 }}>{b.t}</div>
            <div style={{ fontSize: 11, color: M.fgMuted, marginTop: 2 }}>{b.a} · {b.p}%</div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// Reader
function MobileReader({ state = 'reading', selection = false }) {
  return (
    <div style={{ width: '100%', height: '100%', background: M.bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <StatusBar/>
      {/* Top bar with progress */}
      <div style={{ padding: '4px 20px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Ic.ChevronLeft size={22}/>
        <div style={{ flex: 1 }}>
          <div style={{ height: 2, borderRadius: 99, background: M.bgSunken, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, right: '58%', background: M.fg, borderRadius: 99 }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: M.fgSubtle, fontFamily: 'ui-monospace, monospace' }}>
            <span>上・一</span><span>42%</span>
          </div>
        </div>
        <IconCircle size={30}><Ic.Bookmark size={14}/></IconCircle>
      </div>
      {/* Text */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '16px 24px 120px', fontFamily: M.fontJP, fontSize: 18, lineHeight: 2.05, color: M.fg, position: 'relative' }}>
        <p style={{ margin: '0 0 18px' }}>私はその人を常に先生と呼んでいた。だからここでもただ先生と書くだけで本名は打ち明けない。</p>
        <p style={{ margin: '0 0 18px' }}>これは世間を憚かる遠慮というよりも、その方が私にとって自然だからである。</p>
        <p style={{ margin: '0 0 18px' }}>私はその人の記憶を呼び起すごとに、すぐ「先生」といいたくなる。</p>
        <p style={{ margin: '0 0 18px' }}>私が先生と知り合いになったのは
          {selection ? (
            <span style={{ background: '#DCE6F7', borderRadius: 3, padding: '0 2px', boxShadow: `0 0 0 1.5px ${M.fg}` }}>鎌倉</span>
          ) : '鎌倉'}
          である。その時私はまだ若々しい書生であった。
        </p>
        <p style={{ margin: '0 0 18px' }}>暑中休暇を利用して海水浴に行った友達からぜひ来いという端書を受け取ったので。</p>
      </div>
      {/* Selection pop-over */}
      {selection && (
        <div style={{ position: 'absolute', top: 360, left: '50%', transform: 'translateX(-50%)', zIndex: 35 }}>
          <div style={{
            background: 'rgba(26,25,24,0.95)', color: 'white', borderRadius: 14, padding: '8px 6px',
            display: 'flex', gap: 2, boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          }}>
            {[
              { I: Ic.Search, l: 'Define' },
              { I: Ic.Plus, l: 'Flashcard' },
              { I: Ic.Highlighter, l: 'Highlight' },
              { I: Ic.Copy, l: 'Copy' },
            ].map(a => (
              <div key={a.l} style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <a.I size={16}/>
                <span style={{ fontSize: 10, fontWeight: 500 }}>{a.l}</span>
              </div>
            ))}
          </div>
          <div style={{ width: 12, height: 12, background: 'rgba(26,25,24,0.95)', transform: 'rotate(45deg)', margin: '-6px auto 0' }}/>
        </div>
      )}
      {/* Floating toolbar (collapsed) */}
      {!selection && state === 'reading' && (
        <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 30 }}>
          <div style={{
            background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: `0.5px solid ${M.border}`, borderRadius: 999, padding: '10px 8px', display: 'flex', gap: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          }}>
            {[Ic.Type, Ic.Columns, Ic.List, Ic.Sun].map((I, i) => (
              <div key={i} style={{ width: 42, height: 42, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: M.fg }}><I size={17}/></div>
            ))}
          </div>
        </div>
      )}
      {/* Toolbar expanded */}
      {state === 'toolbar' && (
        <div style={{ position: 'absolute', left: 12, right: 12, bottom: 28, zIndex: 30 }}>
          <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderRadius: 22, padding: 18, border: `0.5px solid ${M.border}`, boxShadow: '0 16px 40px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Reading</div>
              <Ic.X size={18}/>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1, padding: '10px', background: M.bgSunken, borderRadius: 12, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Ic.Minus size={16}/>
                <span style={{ fontFamily: M.fontJP, fontSize: 20 }}>A</span>
                <Ic.Plus size={16}/>
              </div>
              <div style={{ flex: 1, padding: '10px', background: M.bgSunken, borderRadius: 12, textAlign: 'center' }}>
                <Ic.AlignLeft size={16}/>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { l: '横書き', sub: 'Horizontal', on: true },
                { l: '縦書き', sub: 'Vertical', on: false },
              ].map(o => (
                <div key={o.l} style={{ padding: 14, borderRadius: 12, background: o.on ? M.fg : M.bgSunken, color: o.on ? 'white' : M.fg, textAlign: 'center' }}>
                  <div style={{ fontFamily: M.fontJP, fontSize: 18, fontWeight: 500 }}>{o.l}</div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{o.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <HomeIndicator/>
    </div>
  );
}

// Dictionary drawer (from reader context menu)
function DictionaryDrawer({ height = 520, state = 'detail' }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
      {/* backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(2px)' }}/>
      {/* sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height,
        background: M.bgElev, borderRadius: '22px 22px 0 0',
        boxShadow: '0 -12px 40px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '10px 0 4px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 5, borderRadius: 99, background: M.borderStrong }}/>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 22px 24px' }}>
          {state === 'detail' && <DictDetailInner/>}
          {state === 'results' && <DictResultsInner/>}
        </div>
      </div>
    </div>
  );
}

function DictDetailInner() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
        <div style={{ fontFamily: M.fontJP, fontSize: 46, fontWeight: 500, lineHeight: 1, color: M.fg }}>鎌倉</div>
        <div style={{ fontFamily: M.fontJP, fontSize: 18, color: M.fgMuted }}>かまくら</div>
      </div>
      <div style={{ fontSize: 12, color: M.fgMuted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, marginTop: 20, marginBottom: 8 }}>Meaning</div>
      <ol style={{ margin: 0, padding: '0 0 0 20px', fontSize: 15, lineHeight: 1.55, color: M.fg }}>
        <li style={{ marginBottom: 8 }}>Kamakura — coastal city in Kanagawa Prefecture, south of Tokyo.</li>
        <li>Kamakura period (1185–1333).</li>
      </ol>
      <div style={{ fontSize: 12, color: M.fgMuted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, marginTop: 20, marginBottom: 10 }}>Kanji</div>
      <div style={{ display: 'flex', gap: 10 }}>
        {[{ c: '鎌', on: 'ケン', k: 'かま' }, { c: '倉', on: 'ソウ', k: 'くら' }].map(k => (
          <div key={k.c} style={{ flex: 1, padding: '14px 12px', background: M.bgSunken, borderRadius: 14, textAlign: 'center' }}>
            <div style={{ fontFamily: M.fontJP, fontSize: 36, lineHeight: 1 }}>{k.c}</div>
            <div style={{ fontSize: 11, color: M.fgMuted, marginTop: 8, fontFamily: M.fontJP }}>音 {k.on}</div>
            <div style={{ fontSize: 11, color: M.fgMuted, fontFamily: M.fontJP }}>訓 {k.k}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
        <PrimaryButton full style={{ padding: '14px' }}><Ic.Plus size={14}/> Add to deck</PrimaryButton>
        <SecondaryButton style={{ padding: '14px 18px' }}><Ic.Share size={14}/></SecondaryButton>
      </div>
    </>
  );
}

function DictResultsInner() {
  const results = [
    { jp: '鎌倉', rd: 'かまくら', en: 'Kamakura (city)' },
    { jp: '鎌', rd: 'かま', en: 'sickle' },
    { jp: '鎌倉時代', rd: 'かまくらじだい', en: 'Kamakura period' },
    { jp: '鎌倉幕府', rd: 'かまくらばくふ', en: 'Kamakura shogunate' },
  ];
  return (
    <>
      <div style={{ padding: '10px 14px', background: M.bgSunken, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Ic.Search size={16}/>
        <span style={{ fontFamily: M.fontJP, fontSize: 16 }}>鎌</span>
      </div>
      {results.map((r, i) => (
        <div key={i} style={{ padding: '14px 0', borderBottom: i < results.length - 1 ? `0.5px solid ${M.border}` : 'none', display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ minWidth: 80 }}>
            <div style={{ fontFamily: M.fontJP, fontSize: 22, fontWeight: 500, color: M.fg }}>{r.jp}</div>
            <div style={{ fontFamily: M.fontJP, fontSize: 12, color: M.fgMuted, marginTop: 2 }}>{r.rd}</div>
          </div>
          <div style={{ flex: 1, fontSize: 14, color: M.fg }}>{r.en}</div>
          <Ic.ChevronRight size={16} stroke={1.5}/>
        </div>
      ))}
    </>
  );
}

// Reader with drawer
function MobileReaderWithDrawer({ drawerState = 'detail' }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MobileReader state="reading" selection={false}/>
      <DictionaryDrawer state={drawerState}/>
    </div>
  );
}

// Full-page Dictionary (from tab)
function MobileDictionary({ state = 'empty' }) {
  return (
    <PageShell
      title="Dictionary"
      active="dict"
      trailing={<IconCircle><Ic.Filter size={16}/></IconCircle>}
    >
      <div style={{ padding: '14px 16px', background: M.bgElev, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, border: `0.5px solid ${M.border}`, marginBottom: 18 }}>
        <Ic.Search size={18}/>
        <span style={{ color: state === 'empty' ? M.fgSubtle : M.fg, fontFamily: state === 'empty' ? M.fontUI : M.fontJP, fontSize: 16, flex: 1 }}>
          {state === 'empty' ? 'Word, kana, or English' : '鎌倉'}
        </span>
        {state !== 'empty' && <Ic.X size={16}/>}
      </div>
      {state === 'empty' && (
        <>
          <div style={{ fontSize: 12, color: M.fgMuted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, margin: '8px 4px 10px' }}>Recent</div>
          {['先生', '記憶', '鎌倉', '自然'].map((r, i) => (
            <div key={r} style={{ padding: '14px 4px', borderBottom: `0.5px solid ${M.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: M.fontJP, fontSize: 18, fontWeight: 500 }}>{r}</div>
              <Ic.ChevronRight size={15} stroke={1.4}/>
            </div>
          ))}
        </>
      )}
      {state === 'results' && <DictResultsInner/>}
      {state === 'detail' && <DictDetailInner/>}
    </PageShell>
  );
}

// Decks overview
function MobileDecks() {
  const decks = [
    { n: 'Kokoro — Ch. 1', d: 'Vocabulary from Natsume Sōseki', cg: '#6B5A45', g: '心', c: 42 },
    { n: 'N2 Grammar', d: 'Core patterns', cg: '#2E5D4E', g: '文', c: 180 },
    { n: 'Miyazawa', d: 'Night on the Galactic Railroad', cg: '#263B5C', g: '銀', c: 96 },
    { n: 'Daily Kanji', d: 'Daily review set', cg: '#8E3B36', g: '漢', c: 28 },
  ];
  return (
    <PageShell
      title="Decks"
      active="decks"
      trailing={<IconCircle><Ic.Plus size={18}/></IconCircle>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {decks.map(d => (
          <div key={d.n} style={{ background: M.bgElev, borderRadius: 16, overflow: 'hidden', border: `0.5px solid ${M.border}` }}>
            <div style={{ height: 92, background: `linear-gradient(135deg, ${d.cg}, color-mix(in oklab, ${d.cg} 40%, black))`, position: 'relative', display: 'flex', alignItems: 'flex-end', padding: 12 }}>
              <div style={{ fontFamily: M.fontJP, fontSize: 40, color: 'rgba(255,255,255,0.92)', lineHeight: 1 }}>{d.g}</div>
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: M.fg, letterSpacing: -0.2 }}>{d.n}</div>
              <div style={{ fontSize: 11, color: M.fgMuted, marginTop: 3, lineHeight: 1.3 }}>{d.d}</div>
              <div style={{ fontSize: 11, color: M.fgSubtle, marginTop: 8, fontFamily: 'ui-monospace, monospace' }}>{d.c} cards</div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// Deck detail
function MobileDeckDetail({ modal = false }) {
  const cards = [
    { jp: '鎌倉', rd: 'かまくら', st: 'new' },
    { jp: '先生', rd: 'せんせい', st: 'learning' },
    { jp: '記憶', rd: 'きおく', st: 'mastered' },
    { jp: '心持', rd: 'こころもち', st: 'new' },
    { jp: '憚かる', rd: 'はばかる', st: 'learning' },
    { jp: '書生', rd: 'しょせい', st: 'new' },
  ];
  const stateColor = { new: [M.accentSoft, M.fg], learning: ['rgba(242, 179, 61, 0.18)', '#8B6013'], mastered: ['rgba(59, 122, 64, 0.14)', M.success] };
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <PageShell
        leading={<Ic.ChevronLeft size={22}/>}
        trailing={<><IconCircle><Ic.Edit size={15}/></IconCircle><IconCircle><Ic.MoreHorizontal size={16}/></IconCircle></>}
        flush
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ width: 80, height: 80, borderRadius: 14, background: 'linear-gradient(135deg, #6B5A45, #2B2419)', display: 'flex', alignItems: 'flex-end', padding: 10, color: 'rgba(255,255,255,0.92)', fontFamily: M.fontJP, fontSize: 36, lineHeight: 1 }}>心</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: M.fontDisplay, fontSize: 22, fontWeight: 600, color: M.fg, letterSpacing: -0.3 }}>Kokoro — Ch. 1</div>
            <div style={{ fontSize: 13, color: M.fgMuted, marginTop: 3, lineHeight: 1.4 }}>Vocabulary from Natsume Sōseki's novel</div>
            <div style={{ fontSize: 12, color: M.fgSubtle, marginTop: 6, fontFamily: 'ui-monospace, monospace' }}>42 cards</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
          <PrimaryButton full><Ic.Stars size={14}/> Study</PrimaryButton>
          <SecondaryButton><Ic.Plus size={14}/></SecondaryButton>
          <SecondaryButton><Ic.Grid size={14}/></SecondaryButton>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {cards.map(c => {
            const [bg, fg] = stateColor[c.st];
            return (
              <div key={c.jp} style={{ background: M.bgElev, borderRadius: 14, padding: 14, border: `0.5px solid ${M.border}`, textAlign: 'center' }}>
                <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, background: bg, color: fg, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>{c.st}</div>
                <div style={{ fontFamily: M.fontJP, fontSize: 26, color: M.fg, lineHeight: 1 }}>{c.jp}</div>
                <div style={{ fontFamily: M.fontJP, fontSize: 12, color: M.fgMuted, marginTop: 5 }}>{c.rd}</div>
              </div>
            );
          })}
        </div>
      </PageShell>
      {modal && <CardEditSheet/>}
    </div>
  );
}

function CardEditSheet() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }}/>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 620, background: M.bgElev, borderRadius: '22px 22px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 0 4px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 5, borderRadius: 99, background: M.borderStrong }}/>
        </div>
        <div style={{ padding: '4px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, color: M.fgMuted, fontWeight: 500 }}>Cancel</span>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Edit card</span>
          <span style={{ fontSize: 15, color: M.fg, fontWeight: 600 }}>Save</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '18px 20px 24px' }}>
          {[
            { l: 'Front (JP)', v: '鎌倉', font: M.fontJP, size: 22 },
            { l: 'Reading', v: 'かまくら', font: M.fontJP, size: 16 },
            { l: 'Back', v: 'Kamakura — coastal city in Kanagawa Prefecture', size: 15 },
            { l: 'Deck', v: 'Kokoro — Ch. 1', size: 15, trail: <Ic.ChevronRight size={14}/> },
          ].map(f => (
            <div key={f.l} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: M.fgMuted, padding: '0 4px 6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.6 }}>{f.l}</div>
              <div style={{ background: M.bgSunken, borderRadius: 14, padding: '14px 16px', fontFamily: f.font || M.fontUI, fontSize: f.size, color: M.fg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {f.v}
                {f.trail}
              </div>
            </div>
          ))}
        </div>
        <HomeIndicator/>
      </div>
    </div>
  );
}

// Study
function MobileStudy({ side = 'front', showContext = true, summary = false }) {
  if (summary) return <MobileStudySummary/>;
  return (
    <div style={{ width: '100%', height: '100%', background: M.bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <StatusBar/>
      <div style={{ padding: '4px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Ic.X size={22}/>
        <div style={{ flex: 1, height: 4, borderRadius: 99, background: M.bgSunken, overflow: 'hidden' }}>
          <div style={{ width: '25%', height: '100%', background: M.fg, borderRadius: 99 }}/>
        </div>
        <span style={{ fontSize: 12, color: M.fgMuted, fontFamily: 'ui-monospace, monospace', fontWeight: 500 }}>3 / 12</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <Pill icon={<Ic.BookOpen size={11}/>} style={{ fontSize: 11 }}>
            Context
            <div style={{ width: 24, height: 14, borderRadius: 99, background: showContext ? M.fg : M.borderStrong, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 1, left: showContext ? 11 : 1, width: 12, height: 12, borderRadius: '50%', background: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}/>
            </div>
          </Pill>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Card pad={0} style={{ padding: '40px 24px', minHeight: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
            <div style={{ fontFamily: M.fontJP, fontSize: 64, fontWeight: 500, color: M.fg, lineHeight: 1 }}>鎌倉</div>
            {side === 'back' && (
              <>
                <div style={{ width: 60, height: 1, background: M.border, margin: '22px 0' }}/>
                <div style={{ fontFamily: M.fontJP, fontSize: 20, color: M.fgMuted }}>かまくら</div>
                <div style={{ fontSize: 16, color: M.fg, marginTop: 14, textAlign: 'center', lineHeight: 1.5, maxWidth: 280 }}>Kamakura — coastal city in Kanagawa Prefecture.</div>
              </>
            )}
          </Card>
          {showContext && (
            <div style={{ marginTop: 14, padding: 14, background: M.bgSunken, borderRadius: 14, borderLeft: `3px solid ${M.fg}` }}>
              <div style={{ fontSize: 10, color: M.fgMuted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, marginBottom: 6 }}>From Kokoro · 上・一</div>
              <div style={{ fontFamily: M.fontJP, fontSize: 14, lineHeight: 1.8, color: M.fg }}>
                私が先生と知り合いになったのは<mark style={{ background: M.highlight, padding: '0 2px' }}>鎌倉</mark>である。
              </div>
            </div>
          )}
        </div>
        {side === 'front' ? (
          <PrimaryButton full style={{ margin: '16px 0 28px' }}>Show answer</PrimaryButton>
        ) : (
          <div style={{ display: 'flex', gap: 10, margin: '16px 0 28px' }}>
            <button style={{ flex: 1, padding: '18px', background: M.bgElev, color: M.fg, border: `0.5px solid ${M.borderStrong}`, borderRadius: 16, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ic.X size={16}/> Don't know
            </button>
            <button style={{ flex: 1, padding: '18px', background: M.fg, color: 'white', border: 'none', borderRadius: 16, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ic.Check size={16}/> I know it
            </button>
          </div>
        )}
      </div>
      <HomeIndicator/>
    </div>
  );
}

function MobileStudySummary() {
  return (
    <PageShell contentPad={false}>
      <div style={{ flex: 1, padding: '40px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 96, height: 96, borderRadius: 999, background: M.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: M.fg }}>
          <Ic.Check size={44} stroke={2.2}/>
        </div>
        <div style={{ fontFamily: M.fontDisplay, fontSize: 32, fontWeight: 700, letterSpacing: -0.5, marginTop: 32, color: M.fg, textAlign: 'center' }}>Nice work</div>
        <div style={{ fontSize: 15, color: M.fgMuted, marginTop: 8, textAlign: 'center' }}>You reviewed 12 cards.</div>
        <div style={{ width: '100%', display: 'flex', gap: 10, marginTop: 36 }}>
          {[
            { l: 'Reviewed', v: '12' },
            { l: 'Known', v: '9' },
            { l: 'To review', v: '3' },
          ].map(s => (
            <Card key={s.l} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: M.fontDisplay, fontSize: 28, fontWeight: 700, color: M.fg, letterSpacing: -0.5 }}>{s.v}</div>
              <div style={{ fontSize: 11, color: M.fgMuted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{s.l}</div>
            </Card>
          ))}
        </div>
        <div style={{ width: '100%', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PrimaryButton full>Study again</PrimaryButton>
          <SecondaryButton full>Back to deck</SecondaryButton>
        </div>
      </div>
      <HomeIndicator/>
    </PageShell>
  );
}

// Profile
function MobileProfile({ picker = false }) {
  const kamon = ['波','桜','松','梅','竹','菊','蓮','鶴','亀','龍','虎','鳳','雲','月','星','雪'];
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <PageShell
        title="You"
        active="profile"
        trailing={<IconCircle><Ic.Settings size={16}/></IconCircle>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ width: 84, height: 84, borderRadius: 999, background: M.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: M.fontJP, fontSize: 38, fontWeight: 500, position: 'relative' }}>
            波
            <div style={{ position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: 999, background: 'white', border: `0.5px solid ${M.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: M.fg, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
              <Ic.Pencil size={12}/>
            </div>
          </div>
          <div style={{ fontFamily: M.fontDisplay, fontSize: 22, fontWeight: 600, marginTop: 14, letterSpacing: -0.3 }}>Lucas</div>
          <div style={{ fontSize: 13, color: M.fgMuted, marginTop: 2 }}>@lucas</div>
        </div>
        <div style={{ fontSize: 12, color: M.fgMuted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, marginBottom: 10, padding: '0 4px' }}>Currently reading</div>
        <Card style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 48, height: 66, borderRadius: 6, background: 'linear-gradient(135deg, #6B5A45, #2B2419)', color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'flex-end', padding: 5, fontFamily: M.fontJP, fontSize: 20, lineHeight: 1 }}>心</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: M.fontJP, fontSize: 16, fontWeight: 500 }}>こゝろ</div>
              <div style={{ fontSize: 12, color: M.fgMuted }}>夏目漱石 · 42%</div>
              <div style={{ height: 2, borderRadius: 99, background: M.bgSunken, marginTop: 6, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, right: '58%', background: M.fg, borderRadius: 99 }}/>
              </div>
            </div>
          </div>
        </Card>
        <div style={{ fontSize: 12, color: M.fgMuted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, marginBottom: 10, padding: '0 4px' }}>Account</div>
        <div style={{ background: M.bgElev, borderRadius: 16, border: `0.5px solid ${M.border}`, overflow: 'hidden' }}>
          {[
            { l: 'Username', v: 'lucas' },
            { l: 'Language', v: 'English' },
            { l: 'Sign out', v: '', danger: true },
          ].map((r, i, a) => (
            <div key={r.l} style={{ padding: '15px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < a.length - 1 ? `0.5px solid ${M.border}` : 'none' }}>
              <span style={{ fontSize: 15, color: r.danger ? '#c1412b' : M.fg, fontWeight: r.danger ? 500 : 400 }}>{r.l}</span>
              <span style={{ fontSize: 14, color: M.fgMuted }}>{r.v}</span>
            </div>
          ))}
        </div>
      </PageShell>
      {picker && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }}/>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: M.bgElev, borderRadius: '22px 22px 0 0', padding: '10px 22px 36px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 40, height: 5, borderRadius: 99, background: M.borderStrong }}/>
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Choose avatar</div>
            <div style={{ fontSize: 13, color: M.fgMuted, marginBottom: 20 }}>Traditional Japanese kamon monograms.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {kamon.map((k, i) => (
                <div key={k} style={{ aspectRatio: '1', borderRadius: 999, background: i === 0 ? M.fg : M.bgSunken, color: i === 0 ? 'white' : M.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: M.fontJP, fontSize: 26, fontWeight: 500, border: i === 0 ? `2px solid ${M.fg}` : `0.5px solid ${M.border}` }}>{k}</div>
              ))}
            </div>
            <PrimaryButton full style={{ marginTop: 20 }}>Use this avatar</PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  MobileWelcome, MobileSignup, MobileLibrary, MobileReader, MobileReaderWithDrawer,
  MobileDictionary, MobileDecks, MobileDeckDetail, MobileStudy, MobileProfile, Device,
});
