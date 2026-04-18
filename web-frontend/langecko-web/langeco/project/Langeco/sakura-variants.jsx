// Three expanded interpretations of the Sakura theme, applied to
// Library · Reader · Dictionary · Study. Each variant uses real imagery,
// decorative bamboo, drifting petals, and different structural metaphors.

// Shared assets ──────────────────────────────────────────────────
const SAKURA_IMG = {
  tree: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1200&q=80', // blossom tree
  branch: 'https://images.unsplash.com/photo-1521334884684-d80222895322?w=1200&q=80', // branch close
  canopy: 'https://images.unsplash.com/photo-1491800949844-4fd562799da7?w=1200&q=80', // canopy
  lantern: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=80',
  petalsBg: 'https://images.unsplash.com/photo-1617634667039-8e4cb277ab46?w=1200&q=80', // petals falling
};

// Color base for all sakura variants
const S = {
  bg: '#FBF4F2',
  bgElev: '#FFFBFA',
  bgSunken: '#F3E7E5',
  fg: '#3E2A2F',
  fgMuted: '#7A5A5F',
  fgSubtle: '#B09599',
  border: 'rgba(62, 42, 47, 0.08)',
  borderStrong: 'rgba(62, 42, 47, 0.16)',
  accent: '#D47A8C',
  accentDeep: '#A8455E',
  accentSoft: '#F7DCE0',
  fontJP: '"Klee One", "Shippori Mincho", "Noto Serif JP", serif',
  fontBody: '"Shippori Mincho", "Noto Serif JP", serif',
};

// Drifting petal — 5-petaled SVG sakura with alpha
function Petal({ size = 16, rotate = 0, opacity = 0.9, fill = '#F7B8C6' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ opacity, transform: `rotate(${rotate}deg)`, display: 'block' }}>
      <g>
        {[0, 72, 144, 216, 288].map(a => (
          <path key={a} transform={`rotate(${a} 20 20)`} d="M20 6 Q24 12 23 19 Q22 22 20 22 Q18 22 17 19 Q16 12 20 6 Z" fill={fill}/>
        ))}
        <circle cx="20" cy="20" r="2" fill="#F4D03F" opacity="0.85"/>
      </g>
    </svg>
  );
}

// A field of ambient petals, positioned absolutely
function PetalField({ count = 14, seed = 1, zIndex = 2 }) {
  const petals = [];
  let s = seed * 1000;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < count; i++) {
    petals.push({
      t: rand() * 100, l: rand() * 100,
      sz: 10 + rand() * 16, r: rand() * 360,
      op: 0.35 + rand() * 0.5,
      c: ['#F7B8C6', '#F4A3B6', '#FDD8E0', '#E58DA1'][Math.floor(rand() * 4)],
    });
  }
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex, overflow: 'hidden' }}>
      {petals.map((p, i) => (
        <div key={i} style={{ position: 'absolute', top: `${p.t}%`, left: `${p.l}%` }}>
          <Petal size={p.sz} rotate={p.r} opacity={p.op} fill={p.c}/>
        </div>
      ))}
    </div>
  );
}

// Bamboo stalk — vertical green cylinder with segment rings
function BambooStalk({ height = 300, width = 18, top = 0, left = 'auto', right = 'auto', opacity = 1, segments = 5 }) {
  const ringEvery = height / segments;
  return (
    <div style={{
      position: 'absolute', top, left, right, width, height, opacity, zIndex: 3,
      background: 'linear-gradient(90deg, #5a7840 0%, #8eaa5c 30%, #c8d49a 55%, #8eaa5c 75%, #4d6a35 100%)',
      borderRadius: width / 2,
      boxShadow: '-2px 0 6px rgba(0,0,0,0.08), inset 1px 0 1px rgba(255,255,255,0.4)',
    }}>
      {Array.from({ length: segments - 1 }, (_, i) => (
        <div key={i} style={{
          position: 'absolute', top: ringEvery * (i + 1) - 2, left: -2, right: -2, height: 6,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.22), rgba(90,120,64,0.4) 50%, rgba(0,0,0,0.22))',
          borderRadius: 2,
        }}/>
      ))}
      {/* a little leaf sprig on one segment */}
      <svg width="36" height="24" viewBox="0 0 36 24" style={{ position: 'absolute', top: ringEvery - 10, left: width - 2 }}>
        <path d="M2 14 Q16 2 34 8 Q22 14 2 14 Z" fill="#6a8c46"/>
        <path d="M2 14 Q16 6 34 8" stroke="#3c5627" strokeWidth="0.5" fill="none"/>
      </svg>
    </div>
  );
}

// Sakura branch — an SVG ink branch overlay, with photo-real blossoms at tips
function InkBranch({ width = 360, height = 140, top = 0, left = 0, flip = false }) {
  return (
    <div style={{ position: 'absolute', top, left, width, height, zIndex: 4, pointerEvents: 'none', transform: flip ? 'scaleX(-1)' : 'none' }}>
      <svg width={width} height={height} viewBox="0 0 360 140">
        <defs>
          <radialGradient id="blossom1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF"/>
            <stop offset="30%" stopColor="#FDE6ED"/>
            <stop offset="100%" stopColor="#E58DA1"/>
          </radialGradient>
        </defs>
        {/* main branch */}
        <path d="M0 90 Q60 70 110 75 Q180 82 230 60 Q290 40 360 55" stroke="#3a2418" strokeWidth="3" fill="none" strokeLinecap="round"/>
        {/* sub-branches */}
        <path d="M110 75 Q120 55 135 40" stroke="#3a2418" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M180 75 Q190 95 205 105" stroke="#3a2418" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M260 50 Q275 30 285 20" stroke="#3a2418" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M310 48 Q325 65 332 80" stroke="#3a2418" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        {/* blossom clusters (concentric petals) */}
        {[
          { x: 135, y: 40, s: 1.1 },
          { x: 205, y: 105, s: 0.9 },
          { x: 285, y: 20, s: 1.2 },
          { x: 332, y: 80, s: 0.85 },
          { x: 70, y: 80, s: 0.7 },
          { x: 245, y: 55, s: 0.8 },
        ].map((b, i) => (
          <g key={i} transform={`translate(${b.x} ${b.y}) scale(${b.s})`}>
            {[0, 72, 144, 216, 288].map(a => (
              <ellipse key={a} cx="0" cy="-6" rx="4" ry="7" fill="url(#blossom1)" transform={`rotate(${a})`}/>
            ))}
            <circle r="2" fill="#F4D03F"/>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared status bar + home indicator (match mobile.jsx style)
// ─────────────────────────────────────────────────────────────

function SStatus({ dark = false }) {
  const c = dark ? 'white' : S.fg;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '19px 30px 6px', fontSize: 16, fontWeight: 600, color: c, position: 'relative', zIndex: 30 }}>
      <span>9:41</span>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="0.5" fill={c}/><rect x="4.5" y="5" width="3" height="6" rx="0.5" fill={c}/><rect x="9" y="2.5" width="3" height="8.5" rx="0.5" fill={c}/><rect x="13.5" y="0" width="3" height="11" rx="0.5" fill={c}/></svg>
        <svg width="24" height="11" viewBox="0 0 24 11"><rect x="0.5" y="0.5" width="21" height="10" rx="3" stroke={c} strokeOpacity="0.4" fill="none"/><rect x="2" y="2" width="17" height="7" rx="1.5" fill={c}/></svg>
      </div>
    </div>
  );
}

function SHome({ dark = false }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 34, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 8, pointerEvents: 'none', zIndex: 60 }}>
      <div style={{ width: 139, height: 5, borderRadius: 100, background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(62,42,47,0.25)' }}/>
    </div>
  );
}

function STabBar({ active = 'library', dark = false, tint = S.bgElev }) {
  const tabs = [
    { k: 'library', I: Ic.Library, l: 'Library' },
    { k: 'reader', I: Ic.BookOpen, l: 'Reader' },
    { k: 'dict', I: Ic.Search, l: 'Dict' },
    { k: 'decks', I: Ic.Cards, l: 'Decks' },
    { k: 'profile', I: Ic.User, l: 'You' },
  ];
  const fg = dark ? 'white' : S.fg;
  const subtle = dark ? 'rgba(255,255,255,0.55)' : S.fgSubtle;
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40 }}>
      <div style={{
        background: dark ? 'rgba(62, 42, 47, 0.55)' : `${tint}cc`,
        backdropFilter: 'blur(26px) saturate(170%)', WebkitBackdropFilter: 'blur(26px) saturate(170%)',
        borderTop: `0.5px solid ${dark ? 'rgba(255,255,255,0.12)' : S.border}`,
        padding: '8px 8px 28px', display: 'flex',
      }}>
        {tabs.map(tab => {
          const on = tab.k === active;
          return (
            <div key={tab.k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: on ? fg : subtle }}>
              <tab.I size={22} stroke={on ? 2.1 : 1.7}/>
              <span style={{ fontSize: 10, fontWeight: on ? 600 : 500 }}>{tab.l}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Phone shell wrapper
function SPhone({ children, label, dark = false, variantTag }) {
  return (
    <DCArtboard width={402 + 36} height={874 + 36} label={label}>
      <div style={{ padding: 18, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 402, height: 874, borderRadius: 48, overflow: 'hidden', position: 'relative',
          background: dark ? '#2B1820' : S.bg,
          boxShadow: '0 30px 60px rgba(168, 69, 94, 0.18), 0 0 0 1px rgba(62,42,47,0.1)',
          fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif',
          color: S.fg,
        }}>
          <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 120, height: 35, borderRadius: 24, background: '#000', zIndex: 50 }}/>
          {variantTag && <div style={{ position: 'absolute', top: 14, right: 22, zIndex: 55, fontSize: 9, fontFamily: 'ui-monospace, monospace', color: dark ? 'rgba(255,255,255,0.5)' : S.fgSubtle, letterSpacing: 0.4 }}>{variantTag}</div>}
          {children}
        </div>
      </div>
    </DCArtboard>
  );
}

// ════════════════════════════════════════════════════════════════════════
// VARIANT 1 · GARDEN — photographic hero bands, soft ambient petals,
// washi textures. Imagery lives as a tall banner on each screen.
// ════════════════════════════════════════════════════════════════════════

function V1_Library() {
  return (
    <SPhone label="V1 · Library" variantTag="v1 · garden">
      <SStatus/>
      {/* hero photo band */}
      <div style={{ position: 'relative', height: 260, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${SAKURA_IMG.tree})`, backgroundSize: 'cover', backgroundPosition: 'center' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(62,42,47,0.0) 0%, rgba(62,42,47,0.15) 50%, rgba(251,244,242,0.95) 100%)' }}/>
        <PetalField count={10} seed={1}/>
        <div style={{ position: 'absolute', left: 20, right: 20, bottom: 60, color: 'white', textShadow: '0 2px 16px rgba(62,42,47,0.5)' }}>
          <div style={{ fontFamily: S.fontJP, fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.9 }}>春 · haru no hon</div>
          <div style={{ fontFamily: S.fontJP, fontSize: 34, fontWeight: 500, letterSpacing: -0.5, marginTop: 4 }}>Library</div>
        </div>
      </div>
      <div style={{ padding: '14px 20px 110px', position: 'relative' }}>
        {/* continue */}
        <div style={{ background: S.bgElev, borderRadius: 18, padding: 16, border: `0.5px solid ${S.border}`, display: 'flex', gap: 12, boxShadow: '0 6px 20px rgba(168,69,94,0.08)', position: 'relative', overflow: 'hidden' }}>
          <Petal size={28} rotate={24} opacity={0.25} fill="#E58DA1"/>
          <div style={{ position: 'absolute', top: -6, right: -6 }}><Petal size={36} rotate={-18} opacity={0.18}/></div>
          <div style={{ width: 64, height: 88, borderRadius: 8, background: `linear-gradient(135deg, #A8455E, #5a1f2f)`, display: 'flex', alignItems: 'flex-end', padding: 6, color: 'rgba(255,255,255,0.95)', fontFamily: S.fontJP, fontSize: 30, lineHeight: 1 }}>心</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: S.fontJP, fontSize: 20, color: S.fg }}>こゝろ</div>
            <div style={{ fontSize: 13, color: S.fgMuted }}>夏目漱石</div>
            <div style={{ height: 3, borderRadius: 99, background: S.bgSunken, marginTop: 10, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, right: '58%', background: `linear-gradient(90deg, ${S.accentDeep}, ${S.accent})`, borderRadius: 99 }}/>
            </div>
            <div style={{ fontSize: 11, color: S.fgSubtle, marginTop: 5, fontFamily: 'ui-monospace, monospace' }}>42% · 2h ago</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: S.fgMuted, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, marginTop: 22, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, height: 1, background: S.border }}/>
          <Petal size={14} opacity={0.7}/>
          <span>Your library</span>
          <span style={{ flex: 1, height: 1, background: S.border }}/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { t: '銀河鉄道の夜', a: '宮沢賢治', cg: '#8E3B5C', g: '銀' },
            { t: '走れメロス', a: '太宰治', cg: '#A8455E', g: '走' },
            { t: '雪国', a: '川端康成', cg: '#6B3A4A', g: '雪' },
            { t: '羅生門', a: '芥川龍之介', cg: '#7B3A5A', g: '羅' },
          ].map(b => (
            <div key={b.t}>
              <div style={{ aspectRatio: '3/4', borderRadius: 10, background: `linear-gradient(135deg, ${b.cg}, #3a1824)`, display: 'flex', alignItems: 'flex-end', padding: 10, color: 'rgba(255,255,255,0.92)', fontFamily: S.fontJP, fontSize: 38, lineHeight: 1, position: 'relative', overflow: 'hidden' }}>
                {b.g}
                <div style={{ position: 'absolute', top: 6, right: 6 }}><Petal size={14} opacity={0.8}/></div>
              </div>
              <div style={{ fontFamily: S.fontJP, fontSize: 14, color: S.fg, marginTop: 8 }}>{b.t}</div>
              <div style={{ fontSize: 11, color: S.fgMuted, marginTop: 2 }}>{b.a}</div>
            </div>
          ))}
        </div>
      </div>
      <STabBar active="library"/>
      <SHome/>
    </SPhone>
  );
}

function V1_Reader() {
  return (
    <SPhone label="V1 · Reader" variantTag="v1 · garden">
      <SStatus/>
      {/* top photo band */}
      <div style={{ position: 'relative', height: 120, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${SAKURA_IMG.canopy})`, backgroundSize: 'cover', backgroundPosition: 'center 40%' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(251,244,242,0) 40%, rgba(251,244,242,1) 100%)' }}/>
        <PetalField count={6} seed={4}/>
      </div>
      <div style={{ padding: '0 20px 10px', display: 'flex', alignItems: 'center', gap: 10, color: S.fg, marginTop: -44, position: 'relative', zIndex: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 999, background: S.bgElev, border: `0.5px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(168,69,94,0.12)' }}><Ic.ChevronLeft size={18}/></div>
        <div style={{ flex: 1 }}>
          <div style={{ height: 2, borderRadius: 99, background: 'rgba(62,42,47,0.12)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, right: '58%', background: `linear-gradient(90deg, ${S.accentDeep}, ${S.accent})`, borderRadius: 99 }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: S.fgSubtle, fontFamily: 'ui-monospace, monospace' }}><span>こゝろ · 上・一</span><span>42%</span></div>
        </div>
        <div style={{ width: 34, height: 34, borderRadius: 999, background: S.bgElev, border: `0.5px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.accentDeep }}><Ic.Bookmark size={14}/></div>
      </div>
      <div style={{ position: 'relative', padding: '14px 26px 120px', fontFamily: S.fontBody, fontSize: 18, lineHeight: 2.1, color: S.fg, flex: 1, overflow: 'hidden' }}>
        {/* soft drifting petals over the text */}
        <PetalField count={5} seed={7} zIndex={0}/>
        <p style={{ margin: '0 0 18px', position: 'relative', zIndex: 1 }}>私はその人を常に先生と呼んでいた。だからここでもただ先生と書くだけで本名は打ち明けない。</p>
        <p style={{ margin: '0 0 18px', position: 'relative', zIndex: 1 }}>これは世間を憚かる遠慮というよりも、その方が私にとって自然だからである。</p>
        <p style={{ margin: '0 0 18px', position: 'relative', zIndex: 1 }}>私はその人の記憶を呼び起すごとに、すぐ「先生」といいたくなる。</p>
        <p style={{ margin: '0 0 18px', position: 'relative', zIndex: 1 }}>私が先生と知り合いになったのは<mark style={{ background: S.accentSoft, padding: '0 2px', borderRadius: 2, color: S.fg }}>鎌倉</mark>である。</p>
      </div>
      <div style={{ position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)', zIndex: 30 }}>
        <div style={{ background: 'rgba(255,251,250,0.9)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: `0.5px solid ${S.border}`, borderRadius: 999, padding: '10px 8px', display: 'flex', gap: 2, boxShadow: '0 8px 28px rgba(168,69,94,0.18)' }}>
          {[Ic.Type, Ic.Columns, Ic.List, Ic.Sun].map((I, i) => (
            <div key={i} style={{ width: 42, height: 42, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.fg }}><I size={17}/></div>
          ))}
        </div>
      </div>
      <SHome/>
    </SPhone>
  );
}

function V1_Dict() {
  return (
    <SPhone label="V1 · Dictionary" variantTag="v1 · garden">
      <SStatus/>
      {/* photo header */}
      <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${SAKURA_IMG.branch})`, backgroundSize: 'cover', backgroundPosition: 'center' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(62,42,47,0.1) 0%, rgba(251,244,242,0.98) 90%)' }}/>
        <PetalField count={8} seed={2}/>
      </div>
      <div style={{ padding: '0 20px 100px', marginTop: -90, position: 'relative', zIndex: 10 }}>
        <div style={{ background: S.bgElev, borderRadius: 18, padding: 22, border: `0.5px solid ${S.border}`, boxShadow: '0 10px 30px rgba(168,69,94,0.15)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -10, right: -6 }}><Petal size={42} opacity={0.25}/></div>
          <div style={{ fontSize: 11, color: S.fgMuted, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600 }}>Entry · noun</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
            <div style={{ fontFamily: S.fontJP, fontSize: 56, fontWeight: 500, lineHeight: 1, color: S.fg }}>鎌倉</div>
            <div style={{ fontFamily: S.fontJP, fontSize: 18, color: S.fgMuted }}>かまくら</div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {['N2', 'place', 'proper'].map(t => (
              <div key={t} style={{ padding: '3px 10px', background: S.accentSoft, color: S.accentDeep, borderRadius: 99, fontSize: 10, fontWeight: 600, letterSpacing: 0.4 }}>{t}</div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: S.fgMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, marginTop: 22, marginBottom: 8 }}>Meaning</div>
          <ol style={{ margin: 0, padding: '0 0 0 20px', fontFamily: S.fontBody, fontSize: 15, lineHeight: 1.6, color: S.fg }}>
            <li style={{ marginBottom: 8 }}>Kamakura — coastal city in Kanagawa Prefecture, south of Tokyo.</li>
            <li>Kamakura period (1185–1333), a defining era of samurai culture.</li>
          </ol>
          <div style={{ fontSize: 12, color: S.fgMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, marginTop: 20, marginBottom: 10 }}>Kanji</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[{ c: '鎌', o: 'ケン', k: 'かま' }, { c: '倉', o: 'ソウ', k: 'くら' }].map(k => (
              <div key={k.c} style={{ flex: 1, padding: '14px 12px', background: S.bgSunken, borderRadius: 14, textAlign: 'center', border: `0.5px solid ${S.border}` }}>
                <div style={{ fontFamily: S.fontJP, fontSize: 36, color: S.fg }}>{k.c}</div>
                <div style={{ fontSize: 11, color: S.fgMuted, marginTop: 8 }}>音 {k.o}</div>
                <div style={{ fontSize: 11, color: S.fgMuted }}>訓 {k.k}</div>
              </div>
            ))}
          </div>
          <button style={{ marginTop: 18, width: '100%', padding: 14, background: `linear-gradient(135deg, ${S.accentDeep}, ${S.accent})`, color: 'white', border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 18px rgba(168,69,94,0.3)' }}>
            <Ic.Plus size={14}/> Add to deck
          </button>
        </div>
      </div>
      <STabBar active="dict"/>
      <SHome/>
    </SPhone>
  );
}

function V1_Study() {
  return (
    <SPhone label="V1 · Study" variantTag="v1 · garden">
      <SStatus/>
      <div style={{ padding: '4px 20px 16px', display: 'flex', alignItems: 'center', gap: 12, color: S.fg }}>
        <Ic.X size={22}/>
        <div style={{ flex: 1, height: 4, borderRadius: 99, background: S.bgSunken, overflow: 'hidden' }}>
          <div style={{ width: '25%', height: '100%', background: `linear-gradient(90deg, ${S.accentDeep}, ${S.accent})`, borderRadius: 99 }}/>
        </div>
        <span style={{ fontSize: 12, color: S.fgMuted, fontFamily: 'ui-monospace, monospace', fontWeight: 500 }}>3 / 12</span>
      </div>
      {/* floating petals background */}
      <PetalField count={16} seed={9} zIndex={1}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px', position: 'relative', zIndex: 2 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* card with a top image band */}
          <div style={{ background: S.bgElev, borderRadius: 20, overflow: 'hidden', border: `0.5px solid ${S.border}`, boxShadow: '0 16px 40px rgba(168,69,94,0.16)' }}>
            <div style={{ height: 90, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${SAKURA_IMG.branch})`, backgroundSize: 'cover', backgroundPosition: 'center' }}/>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,251,250,0) 40%, rgba(255,251,250,1))' }}/>
              <PetalField count={5} seed={11}/>
            </div>
            <div style={{ padding: '4px 24px 36px', textAlign: 'center' }}>
              <div style={{ fontFamily: S.fontJP, fontSize: 64, fontWeight: 500, color: S.fg, lineHeight: 1 }}>鎌倉</div>
              <div style={{ width: 60, height: 1, background: S.border, margin: '20px auto' }}/>
              <div style={{ fontFamily: S.fontJP, fontSize: 20, color: S.fgMuted }}>かまくら</div>
              <div style={{ fontSize: 15, color: S.fg, marginTop: 14, lineHeight: 1.5, fontFamily: S.fontBody }}>Kamakura — coastal city in Kanagawa Prefecture.</div>
            </div>
          </div>
          <div style={{ marginTop: 14, padding: 14, background: 'rgba(247,220,224,0.5)', borderRadius: 14, borderLeft: `3px solid ${S.accentDeep}` }}>
            <div style={{ fontSize: 10, color: S.fgMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>From Kokoro · 上・一</div>
            <div style={{ fontFamily: S.fontBody, fontSize: 14, lineHeight: 1.8, color: S.fg }}>…知り合いになったのは<mark style={{ background: S.accentSoft, padding: '0 2px', color: S.accentDeep }}>鎌倉</mark>である。</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, margin: '16px 0 28px' }}>
          <button style={{ flex: 1, padding: 18, background: S.bgElev, color: S.fg, border: `0.5px solid ${S.borderStrong}`, borderRadius: 16, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Ic.X size={16}/> Don't know</button>
          <button style={{ flex: 1, padding: 18, background: `linear-gradient(135deg, ${S.accentDeep}, ${S.accent})`, color: 'white', border: 'none', borderRadius: 16, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 18px rgba(168,69,94,0.3)' }}><Ic.Check size={16}/> I know it</button>
        </div>
      </div>
      <SHome/>
    </SPhone>
  );
}

// ════════════════════════════════════════════════════════════════════════
// VARIANT 2 · BRANCH — ink-drawn sakura branch arcs over every header.
// Bamboo stalk as sidebar architecture. Vertical tategaki flavor.
// Strong editorial, washi-paper feel.
// ════════════════════════════════════════════════════════════════════════

function V2_Library() {
  return (
    <SPhone label="V2 · Library" variantTag="v2 · branch">
      <SStatus/>
      {/* ink branch header */}
      <div style={{ position: 'relative', height: 180 }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 80% 20%, ${S.accentSoft}, ${S.bg} 60%)` }}/>
        <InkBranch width={402} height={170} top={0} left={0}/>
        <div style={{ position: 'absolute', bottom: 14, left: 22, right: 22 }}>
          <div style={{ fontFamily: S.fontJP, fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: S.fgMuted }}>書庫 · shoko</div>
          <div style={{ fontFamily: S.fontJP, fontSize: 34, fontWeight: 500, letterSpacing: -0.5, color: S.fg, marginTop: 2 }}>Library</div>
        </div>
      </div>
      {/* body with bamboo at left */}
      <div style={{ position: 'relative', padding: '20px 20px 110px 40px', flex: 1, overflow: 'hidden' }}>
        <BambooStalk height={600} width={14} top={0} left={14} opacity={0.9}/>
        <div style={{ background: S.bgElev, borderRadius: 16, padding: 16, border: `0.5px solid ${S.border}`, display: 'flex', gap: 12, boxShadow: '0 4px 14px rgba(168,69,94,0.06)' }}>
          <div style={{ width: 60, height: 82, borderRadius: 6, background: `linear-gradient(135deg, #A8455E, #3a1824)`, display: 'flex', alignItems: 'flex-end', padding: 6, color: 'white', fontFamily: S.fontJP, fontSize: 28, lineHeight: 1 }}>心</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: S.accentDeep, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 700 }}>Continue</div>
            <div style={{ fontFamily: S.fontJP, fontSize: 20, color: S.fg, marginTop: 2 }}>こゝろ</div>
            <div style={{ fontSize: 13, color: S.fgMuted }}>夏目漱石</div>
            <div style={{ height: 3, borderRadius: 99, background: S.bgSunken, marginTop: 10, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, right: '58%', background: S.accentDeep, borderRadius: 99 }}/>
            </div>
          </div>
        </div>
        <div style={{ fontFamily: S.fontJP, fontSize: 11, color: S.fgMuted, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, margin: '22px 0 12px' }}>蔵書 · your shelf</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { t: '銀河鉄道の夜', a: '宮沢賢治', cg: '#5C2B4A', g: '銀' },
            { t: '走れメロス', a: '太宰治', cg: '#A8455E', g: '走' },
            { t: '雪国', a: '川端康成', cg: '#6B3A4A', g: '雪' },
            { t: '羅生門', a: '芥川龍之介', cg: '#7B2D3A', g: '羅' },
          ].map(b => (
            <div key={b.t}>
              <div style={{ aspectRatio: '3/4', borderRadius: 8, background: `linear-gradient(135deg, ${b.cg}, #2a0e1a)`, display: 'flex', alignItems: 'flex-end', padding: 10, color: 'rgba(255,255,255,0.95)', fontFamily: S.fontJP, fontSize: 38, lineHeight: 1 }}>{b.g}</div>
              <div style={{ fontFamily: S.fontJP, fontSize: 14, color: S.fg, marginTop: 8 }}>{b.t}</div>
              <div style={{ fontSize: 11, color: S.fgMuted, marginTop: 2 }}>{b.a}</div>
            </div>
          ))}
        </div>
      </div>
      <STabBar active="library"/>
      <SHome/>
    </SPhone>
  );
}

function V2_Reader() {
  return (
    <SPhone label="V2 · Reader" variantTag="v2 · branch">
      <SStatus/>
      <div style={{ padding: '4px 20px 10px', display: 'flex', alignItems: 'center', gap: 10, color: S.fg }}>
        <Ic.ChevronLeft size={22}/>
        <div style={{ flex: 1 }}>
          <div style={{ height: 2, borderRadius: 99, background: S.bgSunken, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, right: '58%', background: S.accentDeep, borderRadius: 99 }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: S.fgSubtle, fontFamily: 'ui-monospace, monospace' }}><span>こゝろ · 上・一</span><span>42%</span></div>
        </div>
        <div style={{ width: 30, height: 30, borderRadius: 999, background: S.bgElev, border: `0.5px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.accentDeep }}><Ic.Bookmark size={14}/></div>
      </div>
      {/* ink branch top-right drooping */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <InkBranch width={300} height={120} top={-10} left={110} flip/>
        {/* bamboo stalks on both sides */}
        <BambooStalk height={700} width={12} top={-20} left={6} opacity={0.85}/>
        <BambooStalk height={700} width={10} top={40} right={6} opacity={0.55} segments={6}/>
        <div style={{ padding: '110px 38px 120px', fontFamily: S.fontBody, fontSize: 18, lineHeight: 2.1, color: S.fg, position: 'relative', zIndex: 5 }}>
          <p style={{ margin: '0 0 18px' }}>私はその人を常に先生と呼んでいた。だからここでもただ先生と書くだけで本名は打ち明けない。</p>
          <p style={{ margin: '0 0 18px' }}>これは世間を憚かる遠慮というよりも、その方が私にとって自然だからである。</p>
          <p style={{ margin: '0 0 18px' }}>私はその人の記憶を呼び起すごとに、すぐ「先生」といいたくなる。</p>
          <p style={{ margin: '0 0 18px' }}>私が先生と知り合いになったのは<mark style={{ background: S.accentSoft, padding: '0 2px', color: S.accentDeep, borderRadius: 2 }}>鎌倉</mark>である。</p>
        </div>
        <div style={{ position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)', zIndex: 30 }}>
          <div style={{ background: 'rgba(255,251,250,0.9)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: `0.5px solid ${S.border}`, borderRadius: 999, padding: '10px 8px', display: 'flex', gap: 2, boxShadow: '0 8px 28px rgba(168,69,94,0.18)' }}>
            {[Ic.Type, Ic.Columns, Ic.List, Ic.Sun].map((I, i) => (
              <div key={i} style={{ width: 42, height: 42, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.fg }}><I size={17}/></div>
            ))}
          </div>
        </div>
      </div>
      <SHome/>
    </SPhone>
  );
}

function V2_Dict() {
  return (
    <SPhone label="V2 · Dictionary" variantTag="v2 · branch">
      <SStatus/>
      {/* ink branch header */}
      <div style={{ position: 'relative', height: 150, background: `linear-gradient(180deg, ${S.accentSoft} 0%, ${S.bg} 100%)` }}>
        <InkBranch width={402} height={140} top={0} left={0}/>
        <div style={{ position: 'absolute', bottom: 14, left: 22, right: 22 }}>
          <div style={{ fontFamily: S.fontJP, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: S.fgMuted }}>辞書 · jisho</div>
          <div style={{ fontFamily: S.fontJP, fontSize: 28, fontWeight: 500, color: S.fg, marginTop: 2 }}>Dictionary</div>
        </div>
      </div>
      <div style={{ position: 'relative', padding: '18px 20px 100px 38px', flex: 1, overflow: 'hidden' }}>
        <BambooStalk height={700} width={14} top={-100} left={14}/>
        {/* search */}
        <div style={{ padding: '12px 16px', background: S.bgElev, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, border: `0.5px solid ${S.border}`, marginBottom: 18 }}>
          <Ic.Search size={18} stroke={1.8}/>
          <span style={{ fontFamily: S.fontJP, fontSize: 16, flex: 1, color: S.fg }}>鎌倉</span>
          <Ic.X size={16}/>
        </div>
        {/* big entry */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
          <div style={{ fontFamily: S.fontJP, fontSize: 52, fontWeight: 500, lineHeight: 1, color: S.fg }}>鎌倉</div>
          <div style={{ fontFamily: S.fontJP, fontSize: 17, color: S.fgMuted }}>かまくら</div>
        </div>
        <div style={{ display: 'flex', gap: 6, margin: '10px 0 22px' }}>
          {['N2', 'proper noun'].map(t => (
            <div key={t} style={{ padding: '3px 10px', background: S.accentSoft, color: S.accentDeep, borderRadius: 99, fontSize: 10, fontWeight: 600, letterSpacing: 0.4 }}>{t}</div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: S.fgMuted, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Meaning</div>
        <ol style={{ margin: 0, padding: '0 0 0 18px', fontFamily: S.fontBody, fontSize: 15, lineHeight: 1.6, color: S.fg }}>
          <li style={{ marginBottom: 8 }}>Kamakura — coastal city in Kanagawa Prefecture.</li>
          <li>Kamakura period (1185–1333).</li>
        </ol>
        <div style={{ fontSize: 11, color: S.fgMuted, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600, marginTop: 22, marginBottom: 10 }}>Kanji</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[{ c: '鎌', o: 'ケン', k: 'かま' }, { c: '倉', o: 'ソウ', k: 'くら' }].map(k => (
            <div key={k.c} style={{ flex: 1, padding: '14px 12px', background: S.bgElev, borderRadius: 12, textAlign: 'center', border: `0.5px solid ${S.border}` }}>
              <div style={{ fontFamily: S.fontJP, fontSize: 34, color: S.fg }}>{k.c}</div>
              <div style={{ fontSize: 11, color: S.fgMuted, marginTop: 6 }}>音 {k.o}</div>
              <div style={{ fontSize: 11, color: S.fgMuted }}>訓 {k.k}</div>
            </div>
          ))}
        </div>
        <button style={{ marginTop: 18, width: '100%', padding: 14, background: S.accentDeep, color: 'white', border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Ic.Plus size={14}/> Add to deck
        </button>
      </div>
      <STabBar active="dict"/>
      <SHome/>
    </SPhone>
  );
}

function V2_Study() {
  return (
    <SPhone label="V2 · Study" variantTag="v2 · branch">
      <SStatus/>
      <div style={{ padding: '4px 20px 16px', display: 'flex', alignItems: 'center', gap: 12, color: S.fg, position: 'relative', zIndex: 10 }}>
        <Ic.X size={22}/>
        <div style={{ flex: 1, height: 4, borderRadius: 99, background: S.bgSunken, overflow: 'hidden' }}>
          <div style={{ width: '25%', height: '100%', background: S.accentDeep, borderRadius: 99 }}/>
        </div>
        <span style={{ fontSize: 12, color: S.fgMuted, fontFamily: 'ui-monospace, monospace', fontWeight: 500 }}>3 / 12</span>
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* ink branch top */}
        <InkBranch width={420} height={140} top={-20} left={-20}/>
        <InkBranch width={260} height={100} top={500} left={150} flip/>
        {/* twin bamboo */}
        <BambooStalk height={900} width={12} top={-40} left={8} opacity={0.8}/>
        <BambooStalk height={900} width={10} top={30} right={10} opacity={0.55} segments={7}/>
        <div style={{ padding: '80px 38px 0', position: 'relative', zIndex: 5 }}>
          <div style={{ background: S.bgElev, borderRadius: 18, padding: '36px 24px', border: `0.5px solid ${S.border}`, boxShadow: '0 16px 40px rgba(168,69,94,0.14)', textAlign: 'center' }}>
            <div style={{ fontFamily: S.fontJP, fontSize: 62, fontWeight: 500, color: S.fg, lineHeight: 1 }}>鎌倉</div>
            <div style={{ width: 40, height: 1, background: S.borderStrong, margin: '18px auto' }}/>
            <div style={{ fontFamily: S.fontJP, fontSize: 19, color: S.fgMuted }}>かまくら</div>
            <div style={{ fontSize: 15, color: S.fg, marginTop: 12, lineHeight: 1.5, fontFamily: S.fontBody }}>Kamakura — coastal city in Kanagawa.</div>
          </div>
          <div style={{ marginTop: 14, padding: 14, background: 'rgba(247,220,224,0.5)', borderRadius: 12, borderLeft: `3px solid ${S.accentDeep}` }}>
            <div style={{ fontSize: 10, color: S.fgMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>From Kokoro</div>
            <div style={{ fontFamily: S.fontBody, fontSize: 14, lineHeight: 1.8, color: S.fg }}>…知り合いになったのは<mark style={{ background: S.accentSoft, padding: '0 2px', color: S.accentDeep }}>鎌倉</mark>である。</div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 60, left: 20, right: 20, display: 'flex', gap: 10, zIndex: 10 }}>
          <button style={{ flex: 1, padding: 18, background: S.bgElev, color: S.fg, border: `0.5px solid ${S.borderStrong}`, borderRadius: 16, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Ic.X size={16}/> Don't know</button>
          <button style={{ flex: 1, padding: 18, background: S.accentDeep, color: 'white', border: 'none', borderRadius: 16, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Ic.Check size={16}/> I know it</button>
        </div>
      </div>
      <SHome/>
    </SPhone>
  );
}

// ════════════════════════════════════════════════════════════════════════
// VARIANT 3 · COURTYARD — full-bleed blossom photo backdrop with
// frosted-glass content cards floating above. Bamboo as vertical
// architecture framing the edges. Maximalist, immersive.
// ════════════════════════════════════════════════════════════════════════

function CourtyardBackdrop({ img = SAKURA_IMG.tree }) {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' }}/>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(62,42,47,0.25) 0%, rgba(62,42,47,0.5) 100%)' }}/>
      <PetalField count={22} seed={3}/>
      <BambooStalk height={1000} width={16} top={-20} left={4} opacity={0.85}/>
      <BambooStalk height={1000} width={14} top={-10} right={6} opacity={0.75} segments={7}/>
    </>
  );
}

function V3_Library() {
  return (
    <SPhone label="V3 · Library" dark variantTag="v3 · courtyard">
      <CourtyardBackdrop/>
      <SStatus dark/>
      <div style={{ padding: '8px 36px 14px', position: 'relative', zIndex: 10 }}>
        <div style={{ fontFamily: S.fontJP, fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>花見 · hanami</div>
        <div style={{ fontFamily: S.fontJP, fontSize: 36, fontWeight: 500, color: 'white', letterSpacing: -0.5, marginTop: 2, textShadow: '0 2px 20px rgba(62,42,47,0.6)' }}>Library</div>
      </div>
      <div style={{ padding: '10px 36px 110px', position: 'relative', zIndex: 10, overflow: 'hidden', flex: 1 }}>
        {/* glass card continue */}
        <div style={{ background: 'rgba(255,251,250,0.24)', backdropFilter: 'blur(28px) saturate(160%)', WebkitBackdropFilter: 'blur(28px) saturate(160%)', border: '0.5px solid rgba(255,255,255,0.35)', borderRadius: 18, padding: 16, display: 'flex', gap: 12, boxShadow: '0 12px 36px rgba(62,42,47,0.35)' }}>
          <div style={{ width: 60, height: 80, borderRadius: 6, background: `linear-gradient(135deg, #A8455E, #2a0e1a)`, display: 'flex', alignItems: 'flex-end', padding: 6, color: 'white', fontFamily: S.fontJP, fontSize: 26, lineHeight: 1 }}>心</div>
          <div style={{ flex: 1, color: 'white' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600 }}>Continue</div>
            <div style={{ fontFamily: S.fontJP, fontSize: 18, marginTop: 2 }}>こゝろ</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>夏目漱石 · 42%</div>
            <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.22)', marginTop: 10, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, right: '58%', background: S.accent, borderRadius: 99 }}/>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: 600, margin: '22px 0 12px' }}>Shelf</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { t: '銀河鉄道の夜', a: '宮沢賢治', cg: '#5C2B4A', g: '銀' },
            { t: '雪国', a: '川端康成', cg: '#6B3A4A', g: '雪' },
            { t: '走れメロス', a: '太宰治', cg: '#A8455E', g: '走' },
            { t: '羅生門', a: '芥川龍之介', cg: '#7B2D3A', g: '羅' },
          ].map(b => (
            <div key={b.t} style={{ background: 'rgba(255,251,250,0.18)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '0.5px solid rgba(255,255,255,0.28)', borderRadius: 12, padding: 10 }}>
              <div style={{ aspectRatio: '3/4', borderRadius: 6, background: `linear-gradient(135deg, ${b.cg}, #1a0510)`, display: 'flex', alignItems: 'flex-end', padding: 10, color: 'rgba(255,255,255,0.95)', fontFamily: S.fontJP, fontSize: 34, lineHeight: 1 }}>{b.g}</div>
              <div style={{ fontFamily: S.fontJP, fontSize: 13, color: 'white', marginTop: 8 }}>{b.t}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{b.a}</div>
            </div>
          ))}
        </div>
      </div>
      <STabBar active="library" dark/>
      <SHome dark/>
    </SPhone>
  );
}

function V3_Reader() {
  return (
    <SPhone label="V3 · Reader" dark variantTag="v3 · courtyard">
      <CourtyardBackdrop img={SAKURA_IMG.canopy}/>
      <SStatus dark/>
      <div style={{ padding: '4px 36px 10px', display: 'flex', alignItems: 'center', gap: 10, color: 'white', position: 'relative', zIndex: 10 }}>
        <Ic.ChevronLeft size={22}/>
        <div style={{ flex: 1 }}>
          <div style={{ height: 2, borderRadius: 99, background: 'rgba(255,255,255,0.25)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, right: '58%', background: S.accent, borderRadius: 99 }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,0.75)', fontFamily: 'ui-monospace, monospace' }}><span>こゝろ · 上・一</span><span>42%</span></div>
        </div>
        <div style={{ width: 30, height: 30, borderRadius: 999, background: 'rgba(255,255,255,0.2)', border: '0.5px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Ic.Bookmark size={14}/></div>
      </div>
      {/* glass reader card */}
      <div style={{ position: 'relative', zIndex: 10, margin: '14px 36px 120px', padding: '26px 22px', background: 'rgba(255,251,250,0.82)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', borderRadius: 18, border: '0.5px solid rgba(255,255,255,0.5)', boxShadow: '0 16px 50px rgba(62,42,47,0.45)', flex: 1, overflow: 'hidden', fontFamily: S.fontBody, fontSize: 17, lineHeight: 2.1, color: S.fg }}>
        <p style={{ margin: '0 0 16px' }}>私はその人を常に先生と呼んでいた。だからここでもただ先生と書くだけで本名は打ち明けない。</p>
        <p style={{ margin: '0 0 16px' }}>これは世間を憚かる遠慮というよりも、その方が私にとって自然だからである。</p>
        <p style={{ margin: '0 0 16px' }}>私はその人の記憶を呼び起すごとに、すぐ「先生」といいたくなる。</p>
        <p style={{ margin: '0 0 16px' }}>私が先生と知り合いになったのは<mark style={{ background: S.accentSoft, padding: '0 2px', color: S.accentDeep, borderRadius: 2 }}>鎌倉</mark>である。</p>
      </div>
      <div style={{ position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)', zIndex: 30 }}>
        <div style={{ background: 'rgba(62,42,47,0.55)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '0.5px solid rgba(255,255,255,0.25)', borderRadius: 999, padding: '10px 8px', display: 'flex', gap: 2 }}>
          {[Ic.Type, Ic.Columns, Ic.List, Ic.Sun].map((I, i) => (
            <div key={i} style={{ width: 42, height: 42, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><I size={17}/></div>
          ))}
        </div>
      </div>
      <SHome dark/>
    </SPhone>
  );
}

function V3_Dict() {
  return (
    <SPhone label="V3 · Dictionary" dark variantTag="v3 · courtyard">
      <CourtyardBackdrop img={SAKURA_IMG.branch}/>
      <SStatus dark/>
      <div style={{ padding: '8px 36px 14px', position: 'relative', zIndex: 10 }}>
        <div style={{ fontFamily: S.fontJP, fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>辞書 · jisho</div>
        <div style={{ fontFamily: S.fontJP, fontSize: 28, fontWeight: 500, color: 'white', marginTop: 2, textShadow: '0 2px 16px rgba(62,42,47,0.6)' }}>Entry</div>
      </div>
      <div style={{ padding: '4px 36px 100px', position: 'relative', zIndex: 10, flex: 1, overflow: 'hidden' }}>
        {/* search */}
        <div style={{ padding: '12px 14px', background: 'rgba(255,251,250,0.2)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, border: '0.5px solid rgba(255,255,255,0.3)', marginBottom: 14, color: 'white' }}>
          <Ic.Search size={18} stroke={1.8}/>
          <span style={{ fontFamily: S.fontJP, fontSize: 16, flex: 1 }}>鎌倉</span>
          <Ic.X size={16}/>
        </div>
        {/* main glass card */}
        <div style={{ background: 'rgba(255,251,250,0.88)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '0.5px solid rgba(255,255,255,0.5)', borderRadius: 18, padding: 22, boxShadow: '0 18px 50px rgba(62,42,47,0.4)' }}>
          <div style={{ fontSize: 11, color: S.fgMuted, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600 }}>Noun · proper</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
            <div style={{ fontFamily: S.fontJP, fontSize: 56, fontWeight: 500, lineHeight: 1, color: S.fg }}>鎌倉</div>
            <div style={{ fontFamily: S.fontJP, fontSize: 18, color: S.fgMuted }}>かまくら</div>
          </div>
          <div style={{ fontSize: 12, color: S.fgMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, marginTop: 18, marginBottom: 8 }}>Meaning</div>
          <ol style={{ margin: 0, padding: '0 0 0 20px', fontFamily: S.fontBody, fontSize: 15, lineHeight: 1.6, color: S.fg }}>
            <li style={{ marginBottom: 8 }}>Kamakura — coastal city in Kanagawa Prefecture.</li>
            <li>Kamakura period (1185–1333).</li>
          </ol>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            {[{ c: '鎌', o: 'ケン', k: 'かま' }, { c: '倉', o: 'ソウ', k: 'くら' }].map(k => (
              <div key={k.c} style={{ flex: 1, padding: '14px 12px', background: S.bgSunken, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontFamily: S.fontJP, fontSize: 32, color: S.fg }}>{k.c}</div>
                <div style={{ fontSize: 10, color: S.fgMuted, marginTop: 6 }}>音 {k.o} · 訓 {k.k}</div>
              </div>
            ))}
          </div>
          <button style={{ marginTop: 16, width: '100%', padding: 14, background: `linear-gradient(135deg, ${S.accentDeep}, ${S.accent})`, color: 'white', border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 18px rgba(168,69,94,0.3)' }}>
            <Ic.Plus size={14}/> Add to deck
          </button>
        </div>
      </div>
      <STabBar active="dict" dark/>
      <SHome dark/>
    </SPhone>
  );
}

function V3_Study() {
  return (
    <SPhone label="V3 · Study" dark variantTag="v3 · courtyard">
      <CourtyardBackdrop img={SAKURA_IMG.tree}/>
      <SStatus dark/>
      <div style={{ padding: '4px 36px 16px', display: 'flex', alignItems: 'center', gap: 12, color: 'white', position: 'relative', zIndex: 10 }}>
        <Ic.X size={22}/>
        <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
          <div style={{ width: '25%', height: '100%', background: S.accent, borderRadius: 99 }}/>
        </div>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontFamily: 'ui-monospace, monospace', fontWeight: 500 }}>3 / 12</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 36px', position: 'relative', zIndex: 10 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* glass floating card */}
          <div style={{ background: 'rgba(255,251,250,0.88)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '0.5px solid rgba(255,255,255,0.55)', borderRadius: 22, padding: '44px 24px', textAlign: 'center', boxShadow: '0 24px 60px rgba(62,42,47,0.5)' }}>
            <div style={{ fontFamily: S.fontJP, fontSize: 68, fontWeight: 500, color: S.fg, lineHeight: 1 }}>鎌倉</div>
            <div style={{ width: 60, height: 1, background: S.border, margin: '22px auto' }}/>
            <div style={{ fontFamily: S.fontJP, fontSize: 20, color: S.fgMuted }}>かまくら</div>
            <div style={{ fontSize: 15, color: S.fg, marginTop: 14, lineHeight: 1.5, fontFamily: S.fontBody }}>Kamakura — coastal city in Kanagawa.</div>
          </div>
          <div style={{ marginTop: 14, padding: 14, background: 'rgba(255,251,250,0.14)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 12, borderLeft: `3px solid ${S.accent}`, color: 'white' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>From Kokoro · 上・一</div>
            <div style={{ fontFamily: S.fontBody, fontSize: 14, lineHeight: 1.8 }}>…知り合いになったのは<mark style={{ background: 'rgba(212,122,140,0.45)', padding: '0 2px', color: 'white' }}>鎌倉</mark>である。</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, margin: '16px 0 28px' }}>
          <button style={{ flex: 1, padding: 18, background: 'rgba(255,251,250,0.18)', color: 'white', border: '0.5px solid rgba(255,255,255,0.4)', borderRadius: 16, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}><Ic.X size={16}/> Don't know</button>
          <button style={{ flex: 1, padding: 18, background: `linear-gradient(135deg, ${S.accentDeep}, ${S.accent})`, color: 'white', border: 'none', borderRadius: 16, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 24px rgba(168,69,94,0.5)' }}><Ic.Check size={16}/> I know it</button>
        </div>
      </div>
      <SHome dark/>
    </SPhone>
  );
}

Object.assign(window, {
  V1_Library, V1_Reader, V1_Dict, V1_Study,
  V2_Library, V2_Reader, V2_Dict, V2_Study,
  V3_Library, V3_Reader, V3_Dict, V3_Study,
});
