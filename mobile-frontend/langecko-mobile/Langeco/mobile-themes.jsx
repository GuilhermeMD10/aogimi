// Themed wrappers for mobile screens.
// We override CSS vars at the device level so every component inside
// (already using --fg / --bg / --accent / etc.) picks up the theme.

const THEMES = {
  default: {
    bg: '#FAFAF9', bgElev: '#FFFFFF', bgSunken: '#F2F1EE',
    fg: '#1A1918', fgMuted: '#6B6966', fgSubtle: '#A8A5A0',
    border: 'rgba(26, 25, 24, 0.08)', borderStrong: 'rgba(26, 25, 24, 0.14)',
    accent: '#1A1918', accentSoft: 'rgba(26, 25, 24, 0.06)',
    highlight: '#F5E3A9',
    fontJP: '"Hiragino Mincho ProN", "Shippori Mincho", "Noto Serif JP", serif',
    glyph: '語', accentText: 'white',
  },
  kanagawa: {
    bg: '#EDE6D3', bgElev: '#F6F0DE', bgSunken: '#E0D7BE',
    fg: '#0F2340', fgMuted: '#4A5E80', fgSubtle: '#8494AC',
    border: 'rgba(15, 35, 64, 0.10)', borderStrong: 'rgba(15, 35, 64, 0.18)',
    accent: '#1E3D6B', accentSoft: '#C9D6E4',
    highlight: '#D4C999',
    fontJP: '"Shippori Mincho", "Noto Serif JP", serif',
    glyph: '波', accentText: 'white',
  },
  sakura: {
    bg: '#FBF4F2', bgElev: '#FFFBFA', bgSunken: '#F3E7E5',
    fg: '#3E2A2F', fgMuted: '#7A5A5F', fgSubtle: '#B09599',
    border: 'rgba(62, 42, 47, 0.08)', borderStrong: 'rgba(62, 42, 47, 0.16)',
    accent: '#D47A8C', accentSoft: '#F7DCE0',
    highlight: '#F7DCE0',
    fontJP: '"Klee One", "Shippori Mincho", "Noto Serif JP", serif',
    glyph: '桜', accentText: 'white',
  },
  hanami: {
    bg: '#14100C', bgElev: '#1E1814', bgSunken: '#0E0B08',
    fg: '#F5E9D4', fgMuted: '#B0987A', fgSubtle: '#6E6050',
    border: 'rgba(245, 233, 212, 0.10)', borderStrong: 'rgba(245, 233, 212, 0.18)',
    accent: '#E04B2A', accentSoft: 'rgba(224, 75, 42, 0.18)',
    highlight: 'rgba(242, 179, 61, 0.45)',
    fontJP: '"Shippori Mincho", "Noto Serif JP", serif',
    glyph: '灯', accentText: 'white',
  },
};

// A wrapper that overrides the global `M` values used by mobile.jsx
// by setting CSS vars + re-rendering the same screens inside a themed frame.
// Simplest path: rebuild a small per-theme device where we pass the theme
// tokens into a dedicated "ThemedScreen" that mirrors MobileLibrary's layout.

function ThemedDevice({ theme, label, note, children }) {
  const t = THEMES[theme];
  return (
    <DCArtboard width={MOBILE_W + 36} height={MOBILE_H + 36} label={label}>
      <div style={{ padding: 18, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme === 'hanami' ? '#0a0805' : 'transparent' }}>
        <div style={{
          width: MOBILE_W, height: MOBILE_H, borderRadius: 48, overflow: 'hidden', position: 'relative',
          background: t.bg,
          boxShadow: theme === 'hanami'
            ? '0 30px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)'
            : '0 30px 60px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.1)',
          fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif',
          color: t.fg,
        }}>
          <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 120, height: 35, borderRadius: 24, background: '#000', zIndex: 50 }}/>
          {children(t)}
          {note && <div style={{ position: 'absolute', bottom: 48, left: 12, background: 'rgba(0,0,0,0.78)', color: 'white', fontSize: 10, padding: '4px 8px', borderRadius: 6, fontFamily: 'ui-monospace, monospace', zIndex: 70 }}>{note}</div>}
        </div>
      </div>
    </DCArtboard>
  );
}

function TStatusBar({ t, time = '9:41' }) {
  const dark = t.fg === '#F5E9D4';
  const c = t.fg;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '19px 30px 6px', fontSize: 16, fontWeight: 600, color: c, position: 'relative', zIndex: 20 }}>
      <span>{time}</span>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="0.5" fill={c}/><rect x="4.5" y="5" width="3" height="6" rx="0.5" fill={c}/><rect x="9" y="2.5" width="3" height="8.5" rx="0.5" fill={c}/><rect x="13.5" y="0" width="3" height="11" rx="0.5" fill={c}/></svg>
        <svg width="24" height="11" viewBox="0 0 24 11"><rect x="0.5" y="0.5" width="21" height="10" rx="3" stroke={c} strokeOpacity="0.4" fill="none"/><rect x="2" y="2" width="17" height="7" rx="1.5" fill={c}/></svg>
      </div>
    </div>
  );
}

function THomeIndicator({ t }) {
  const dark = t.fg === '#F5E9D4';
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 34, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 8, pointerEvents: 'none', zIndex: 60 }}>
      <div style={{ width: 139, height: 5, borderRadius: 100, background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.22)' }}/>
    </div>
  );
}

function TTabBar({ t, active = 'library' }) {
  const dark = t.fg === '#F5E9D4';
  const tabs = [
    { k: 'library', I: Ic.Library, l: 'Library' },
    { k: 'reader', I: Ic.BookOpen, l: 'Reader' },
    { k: 'dict', I: Ic.Search, l: 'Dict' },
    { k: 'decks', I: Ic.Cards, l: 'Decks' },
    { k: 'profile', I: Ic.User, l: 'You' },
  ];
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40 }}>
      <div style={{
        background: dark ? 'rgba(20, 16, 12, 0.82)' : `color-mix(in oklab, ${t.bg} 82%, transparent)`,
        backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        borderTop: `0.5px solid ${t.border}`, padding: '8px 8px 28px', display: 'flex',
      }}>
        {tabs.map(tab => {
          const on = tab.k === active;
          return (
            <div key={tab.k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: on ? t.fg : t.fgSubtle }}>
              <tab.I size={22} stroke={on ? 2.1 : 1.7}/>
              <span style={{ fontSize: 10, fontWeight: on ? 600 : 500 }}>{tab.l}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Themed Library screen (representative single screen per theme)
function ThemedLibrary({ theme }) {
  return (
    <ThemedDevice theme={theme} label={`Library · ${theme}`}>
      {(t) => (
        <>
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: t.bg, position: 'relative' }}>
            <TStatusBar t={t}/>
            <div style={{ padding: '2px 20px 8px', display: 'flex', justifyContent: 'flex-end', minHeight: 40 }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, background: t.bgElev, border: `0.5px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.fg }}>
                <Ic.Plus size={18}/>
              </div>
            </div>
            <div style={{ padding: '6px 20px 18px', fontFamily: t.fontJP, fontSize: 32, fontWeight: 600, letterSpacing: -0.5, color: t.fg }}>
              Library
            </div>
            <div style={{ flex: 1, overflow: 'hidden', padding: '0 20px 100px' }}>
              <div style={{ marginBottom: 22, background: t.bgElev, borderRadius: 16, padding: 18, border: `0.5px solid ${t.border}` }}>
                <div style={{ fontSize: 12, color: t.fgMuted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>Continue reading</div>
                <div style={{ display: 'flex', gap: 14, marginTop: 10, alignItems: 'center' }}>
                  <div style={{ width: 64, height: 88, borderRadius: 8, background: `linear-gradient(135deg, ${t.accent}, color-mix(in oklab, ${t.accent} 30%, #000))`, display: 'flex', alignItems: 'flex-end', padding: 6, color: 'rgba(255,255,255,0.92)', fontFamily: t.fontJP, fontSize: 28, lineHeight: 1 }}>心</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: t.fontJP, fontSize: 20, fontWeight: 500, color: t.fg }}>こゝろ</div>
                    <div style={{ fontSize: 13, color: t.fgMuted, marginTop: 2 }}>夏目漱石</div>
                    <div style={{ height: 3, borderRadius: 99, background: t.bgSunken, marginTop: 10, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', inset: 0, right: '58%', background: t.accent, borderRadius: 99 }}/>
                    </div>
                    <div style={{ fontSize: 11, color: t.fgSubtle, marginTop: 5, fontFamily: 'ui-monospace, monospace' }}>42% · last read 2h ago</div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: t.fgMuted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, marginBottom: 12, padding: '0 4px' }}>Your library</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { t: '銀河鉄道の夜', a: '宮沢賢治', p: 18, cg: '#263B5C', g: '銀' },
                  { t: '走れメロス', a: '太宰治', p: 67, cg: '#8E3B36', g: '走' },
                  { t: '雪国', a: '川端康成', p: 8, cg: '#45566B', g: '雪' },
                  { t: '羅生門', a: '芥川龍之介', p: 32, cg: '#5C4B36', g: '羅' },
                ].map(b => (
                  <div key={b.t}>
                    <div style={{ aspectRatio: '3/4', borderRadius: 10, background: `linear-gradient(135deg, ${b.cg}, color-mix(in oklab, ${b.cg} 35%, black))`, display: 'flex', alignItems: 'flex-end', padding: 10, color: 'rgba(255,255,255,0.92)', fontFamily: t.fontJP, fontSize: 38, lineHeight: 1 }}>{b.g}</div>
                    <div style={{ fontFamily: t.fontJP, fontSize: 14, fontWeight: 500, color: t.fg, marginTop: 8 }}>{b.t}</div>
                    <div style={{ fontSize: 11, color: t.fgMuted, marginTop: 2 }}>{b.a} · {b.p}%</div>
                  </div>
                ))}
              </div>
            </div>
            <TTabBar t={t} active="library"/>
            <THomeIndicator t={t}/>
          </div>
        </>
      )}
    </ThemedDevice>
  );
}

// Themed Reader screen
function ThemedReader({ theme }) {
  return (
    <ThemedDevice theme={theme} label={`Reader · ${theme}`}>
      {(t) => (
        <div style={{ width: '100%', height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <TStatusBar t={t}/>
          <div style={{ padding: '4px 20px 10px', display: 'flex', alignItems: 'center', gap: 10, color: t.fg }}>
            <Ic.ChevronLeft size={22}/>
            <div style={{ flex: 1 }}>
              <div style={{ height: 2, borderRadius: 99, background: t.bgSunken, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, right: '58%', background: t.accent, borderRadius: 99 }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: t.fgSubtle, fontFamily: 'ui-monospace, monospace' }}>
                <span>上・一</span><span>42%</span>
              </div>
            </div>
            <div style={{ width: 30, height: 30, borderRadius: 999, background: t.bgElev, border: `0.5px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.fg }}>
              <Ic.Bookmark size={14}/>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', padding: '20px 24px 120px', fontFamily: t.fontJP, fontSize: 18, lineHeight: 2.05, color: t.fg }}>
            <p style={{ margin: '0 0 18px' }}>私はその人を常に先生と呼んでいた。だからここでもただ先生と書くだけで本名は打ち明けない。</p>
            <p style={{ margin: '0 0 18px' }}>これは世間を憚かる遠慮というよりも、その方が私にとって自然だからである。</p>
            <p style={{ margin: '0 0 18px' }}>私はその人の記憶を呼び起すごとに、すぐ「先生」といいたくなる。</p>
            <p style={{ margin: '0 0 18px' }}>私が先生と知り合いになったのは<mark style={{ background: t.highlight, padding: '0 2px', color: t.fg, borderRadius: 2 }}>鎌倉</mark>である。</p>
          </div>
          <div style={{ position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)', zIndex: 30 }}>
            <div style={{
              background: t.fg === '#F5E9D4' ? 'rgba(30, 24, 20, 0.85)' : `color-mix(in oklab, ${t.bgElev} 85%, transparent)`,
              backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: `0.5px solid ${t.border}`, borderRadius: 999, padding: '10px 8px', display: 'flex', gap: 2,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', color: t.fg,
            }}>
              {[Ic.Type, Ic.Columns, Ic.List, Ic.Sun].map((I, i) => (
                <div key={i} style={{ width: 42, height: 42, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.fg }}><I size={17}/></div>
              ))}
            </div>
          </div>
          <THomeIndicator t={t}/>
        </div>
      )}
    </ThemedDevice>
  );
}

// Themed Dictionary detail
function ThemedDict({ theme }) {
  return (
    <ThemedDevice theme={theme} label={`Dictionary · ${theme}`}>
      {(t) => (
        <div style={{ width: '100%', height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <TStatusBar t={t}/>
          <div style={{ padding: '2px 20px 8px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: 36, height: 36, borderRadius: 999, background: t.bgElev, border: `0.5px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.fg }}><Ic.Filter size={16}/></div>
          </div>
          <div style={{ padding: '6px 20px 18px', fontFamily: t.fontJP, fontSize: 32, fontWeight: 600, letterSpacing: -0.5, color: t.fg }}>Dictionary</div>
          <div style={{ flex: 1, overflow: 'hidden', padding: '0 20px 100px' }}>
            <div style={{ padding: '14px 16px', background: t.bgElev, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, border: `0.5px solid ${t.border}`, marginBottom: 18, color: t.fg }}>
              <Ic.Search size={18}/>
              <span style={{ fontFamily: t.fontJP, fontSize: 16, flex: 1 }}>鎌倉</span>
              <Ic.X size={16}/>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
              <div style={{ fontFamily: t.fontJP, fontSize: 46, fontWeight: 500, lineHeight: 1, color: t.fg }}>鎌倉</div>
              <div style={{ fontFamily: t.fontJP, fontSize: 18, color: t.fgMuted }}>かまくら</div>
            </div>
            <div style={{ fontSize: 12, color: t.fgMuted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, marginTop: 20, marginBottom: 8 }}>Meaning</div>
            <ol style={{ margin: 0, padding: '0 0 0 20px', fontSize: 15, lineHeight: 1.55, color: t.fg }}>
              <li style={{ marginBottom: 8 }}>Kamakura — coastal city in Kanagawa Prefecture.</li>
              <li>Kamakura period (1185–1333).</li>
            </ol>
            <div style={{ fontSize: 12, color: t.fgMuted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, marginTop: 20, marginBottom: 10 }}>Kanji</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ c: '鎌', o: 'ケン', k: 'かま' }, { c: '倉', o: 'ソウ', k: 'くら' }].map(k => (
                <div key={k.c} style={{ flex: 1, padding: '14px 12px', background: t.bgSunken, borderRadius: 14, textAlign: 'center' }}>
                  <div style={{ fontFamily: t.fontJP, fontSize: 36, lineHeight: 1, color: t.fg }}>{k.c}</div>
                  <div style={{ fontSize: 11, color: t.fgMuted, marginTop: 8 }}>音 {k.o}</div>
                  <div style={{ fontSize: 11, color: t.fgMuted }}>訓 {k.k}</div>
                </div>
              ))}
            </div>
            <button style={{ marginTop: 20, width: '100%', padding: '14px', background: t.accent, color: 'white', border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ic.Plus size={14}/> Add to deck
            </button>
          </div>
          <TTabBar t={t} active="dict"/>
          <THomeIndicator t={t}/>
        </div>
      )}
    </ThemedDevice>
  );
}

// Themed Decks overview
function ThemedDecks({ theme }) {
  return (
    <ThemedDevice theme={theme} label={`Decks · ${theme}`}>
      {(t) => (
        <div style={{ width: '100%', height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <TStatusBar t={t}/>
          <div style={{ padding: '2px 20px 8px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: 36, height: 36, borderRadius: 999, background: t.bgElev, border: `0.5px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.fg }}><Ic.Plus size={18}/></div>
          </div>
          <div style={{ padding: '6px 20px 18px', fontFamily: t.fontJP, fontSize: 32, fontWeight: 600, letterSpacing: -0.5, color: t.fg }}>Decks</div>
          <div style={{ flex: 1, overflow: 'hidden', padding: '0 20px 100px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { n: 'Kokoro — Ch. 1', d: 'Natsume Sōseki', cg: '#6B5A45', g: '心', c: 42 },
                { n: 'N2 Grammar', d: 'Core patterns', cg: '#2E5D4E', g: '文', c: 180 },
                { n: 'Miyazawa', d: 'Galactic Railroad', cg: '#263B5C', g: '銀', c: 96 },
                { n: 'Daily Kanji', d: 'Review set', cg: '#8E3B36', g: '漢', c: 28 },
              ].map(d => (
                <div key={d.n} style={{ background: t.bgElev, borderRadius: 16, overflow: 'hidden', border: `0.5px solid ${t.border}` }}>
                  <div style={{ height: 92, background: `linear-gradient(135deg, ${d.cg}, color-mix(in oklab, ${d.cg} 40%, black))`, display: 'flex', alignItems: 'flex-end', padding: 12 }}>
                    <div style={{ fontFamily: t.fontJP, fontSize: 40, color: 'rgba(255,255,255,0.92)', lineHeight: 1 }}>{d.g}</div>
                  </div>
                  <div style={{ padding: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: t.fg, letterSpacing: -0.2 }}>{d.n}</div>
                    <div style={{ fontSize: 11, color: t.fgMuted, marginTop: 3 }}>{d.d}</div>
                    <div style={{ fontSize: 11, color: t.fgSubtle, marginTop: 8, fontFamily: 'ui-monospace, monospace' }}>{d.c} cards</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <TTabBar t={t} active="decks"/>
          <THomeIndicator t={t}/>
        </div>
      )}
    </ThemedDevice>
  );
}

// Themed Study
function ThemedStudy({ theme }) {
  return (
    <ThemedDevice theme={theme} label={`Study · ${theme}`}>
      {(t) => (
        <div style={{ width: '100%', height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <TStatusBar t={t}/>
          <div style={{ padding: '4px 20px 16px', display: 'flex', alignItems: 'center', gap: 12, color: t.fg }}>
            <Ic.X size={22}/>
            <div style={{ flex: 1, height: 4, borderRadius: 99, background: t.bgSunken, overflow: 'hidden' }}>
              <div style={{ width: '25%', height: '100%', background: t.accent, borderRadius: 99 }}/>
            </div>
            <span style={{ fontSize: 12, color: t.fgMuted, fontFamily: 'ui-monospace, monospace', fontWeight: 500 }}>3 / 12</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ background: t.bgElev, borderRadius: 16, padding: '40px 24px', minHeight: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `0.5px solid ${t.border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
                <div style={{ fontFamily: t.fontJP, fontSize: 64, fontWeight: 500, color: t.fg, lineHeight: 1 }}>鎌倉</div>
                <div style={{ width: 60, height: 1, background: t.border, margin: '22px 0' }}/>
                <div style={{ fontFamily: t.fontJP, fontSize: 20, color: t.fgMuted }}>かまくら</div>
                <div style={{ fontSize: 16, color: t.fg, marginTop: 14, textAlign: 'center', lineHeight: 1.5, maxWidth: 280 }}>Kamakura — coastal city in Kanagawa Prefecture.</div>
              </div>
              <div style={{ marginTop: 14, padding: 14, background: t.bgSunken, borderRadius: 14, borderLeft: `3px solid ${t.accent}` }}>
                <div style={{ fontSize: 10, color: t.fgMuted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, marginBottom: 6 }}>From Kokoro · 上・一</div>
                <div style={{ fontFamily: t.fontJP, fontSize: 14, lineHeight: 1.8, color: t.fg }}>
                  …知り合いになったのは<mark style={{ background: t.highlight, padding: '0 2px', color: t.fg }}>鎌倉</mark>である。
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, margin: '16px 0 28px' }}>
              <button style={{ flex: 1, padding: '18px', background: t.bgElev, color: t.fg, border: `0.5px solid ${t.borderStrong}`, borderRadius: 16, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Ic.X size={16}/> Don't know
              </button>
              <button style={{ flex: 1, padding: '18px', background: t.accent, color: 'white', border: 'none', borderRadius: 16, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Ic.Check size={16}/> I know it
              </button>
            </div>
          </div>
          <THomeIndicator t={t}/>
        </div>
      )}
    </ThemedDevice>
  );
}

// Themed Welcome / Auth
function ThemedWelcome({ theme }) {
  return (
    <ThemedDevice theme={theme} label={`Welcome · ${theme}`}>
      {(t) => (
        <div style={{ width: '100%', height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <TStatusBar t={t}/>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px 32px 0' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontFamily: t.fontJP, fontSize: 180, lineHeight: 1, color: t.fg, opacity: 0.92, marginBottom: 24 }}>{t.glyph}</div>
              <div style={{ fontFamily: t.fontJP, fontSize: 38, fontWeight: 500, color: t.fg, letterSpacing: -0.5, marginBottom: 10 }}>Langeco</div>
              <div style={{ fontSize: 15, color: t.fgMuted, lineHeight: 1.5, maxWidth: 280 }}>
                Read Japanese literature.<br/>Build vocabulary in context.
              </div>
            </div>
            <div style={{ paddingBottom: 50, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button style={{ width: '100%', padding: '16px', background: t.accent, color: 'white', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 600 }}>Create account</button>
              <button style={{ width: '100%', padding: '16px', background: 'transparent', color: t.fg, border: `0.5px solid ${t.borderStrong}`, borderRadius: 14, fontSize: 16, fontWeight: 500 }}>I have an account</button>
            </div>
          </div>
          <THomeIndicator t={t}/>
        </div>
      )}
    </ThemedDevice>
  );
}

// Themed Profile
function ThemedProfile({ theme }) {
  return (
    <ThemedDevice theme={theme} label={`Profile · ${theme}`}>
      {(t) => (
        <div style={{ width: '100%', height: '100%', background: t.bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <TStatusBar t={t}/>
          <div style={{ padding: '6px 20px 18px', fontFamily: t.fontJP, fontSize: 32, fontWeight: 600, letterSpacing: -0.5, color: t.fg }}>You</div>
          <div style={{ flex: 1, padding: '0 20px 100px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0 28px' }}>
              <div style={{ width: 96, height: 96, borderRadius: '50%', background: `linear-gradient(135deg, ${t.accent}, color-mix(in oklab, ${t.accent} 35%, #000))`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: t.fontJP, fontSize: 48, position: 'relative' }}>
                {t.glyph}
                <div style={{ position: 'absolute', bottom: -2, right: -2, width: 30, height: 30, borderRadius: '50%', background: t.bgElev, border: `2px solid ${t.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.fg }}><Ic.Edit size={13}/></div>
              </div>
              <div style={{ fontFamily: t.fontJP, fontSize: 22, fontWeight: 500, color: t.fg, marginTop: 14 }}>Asahi Tanaka</div>
              <div style={{ fontSize: 13, color: t.fgMuted, marginTop: 2 }}>@asahi · joined Mar 2026</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 22 }}>
              {[{ n: '12', l: 'books' }, { n: '438', l: 'words' }, { n: '24', l: 'day streak' }].map(s => (
                <div key={s.l} style={{ background: t.bgElev, border: `0.5px solid ${t.border}`, borderRadius: 12, padding: '14px 6px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 22, fontWeight: 600, color: t.fg }}>{s.n}</div>
                  <div style={{ fontSize: 10, color: t.fgMuted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, marginTop: 4 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ background: t.bgElev, border: `0.5px solid ${t.border}`, borderRadius: 14, overflow: 'hidden' }}>
              {['Currently reading: こゝろ', 'Theme & appearance', 'Reading preferences', 'Account & privacy', 'Sign out'].map((row, i, arr) => (
                <div key={row} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < arr.length - 1 ? `0.5px solid ${t.border}` : 'none', color: t.fg, fontSize: 15 }}>
                  <span>{row}</span>
                  <Ic.ChevronRight size={16} stroke={1.5}/>
                </div>
              ))}
            </div>
          </div>
          <TTabBar t={t} active="profile"/>
          <THomeIndicator t={t}/>
        </div>
      )}
    </ThemedDevice>
  );
}

Object.assign(window, { ThemedLibrary, ThemedReader, ThemedDict, ThemedDecks, ThemedStudy, ThemedWelcome, ThemedProfile, THEMES });
