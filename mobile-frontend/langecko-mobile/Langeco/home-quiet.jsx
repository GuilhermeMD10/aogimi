// Langeco — Home, calmer variants.
// Invitational, not task-heavy. Keeps currently-reading + recent dict lookups.
// Adds a "where would you like to start?" prompt + a small app-demo that
// teaches the bottom nav.

const HOME2_USER = { name: 'Lucas' };
const HOME2_CURRENT = window.BookData.libraryBooks[0]; // Kokoro
const HOME2_SECONDARY = window.BookData.libraryBooks[1];

// Shared recents
const HOME2_DICT = [
  { head: '鎌倉', reading: 'かまくら', gloss: 'Kamakura (city)', saved: true },
  { head: '書生', reading: 'しょせい', gloss: 'student (old-fashioned)' },
  { head: '記憶', reading: 'きおく', gloss: 'memory; recollection', saved: true },
  { head: '暑中', reading: 'しょちゅう', gloss: 'mid-summer' },
  { head: '憚かる', reading: 'はばかる', gloss: 'to hesitate, defer to' },
  { head: '工面', reading: 'くめん', gloss: 'to scrape together' },
];

// Destinations — the features of the app, as places not tasks
const HOME2_DESTINATIONS = [
  { k: 'reader',  I: Ic.BookOpen, l: 'Reader',     dot: '#D97757', desc: 'Read with tap-to-look-up and inline context.' },
  { k: 'dict',    I: Ic.Search,   l: 'Dictionary', dot: '#4B7AA3', desc: 'Full JMdict entries, kanji breakdown, audio.' },
  { k: 'decks',   I: Ic.Cards,    l: 'Decks',      dot: '#8FB08A', desc: 'Flashcards from what you read — at your pace.' },
  { k: 'study',   I: Ic.Sparkles, l: 'Study',      dot: '#C78A4F', desc: 'Review a small set whenever you feel like it.' },
  { k: 'library', I: Ic.Library,  l: 'Library',    dot: '#B5A27C', desc: 'Your books, organized how you like.' },
];

// Small cover tile reused
function Cover({ b, w = 64, h = 88 }) {
  return (
    <div style={{
      width: w, height: h,
      background: `linear-gradient(135deg, ${b.cover} 0%, color-mix(in oklab, ${b.cover} 50%, black) 100%)`,
      borderRadius: 3, flexShrink: 0,
      boxShadow: '0 4px 10px rgba(0,0,0,0.18), inset 1px 0 0 rgba(255,255,255,0.08), inset -1px 0 0 rgba(0,0,0,0.2)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', left: 4, top: 6, right: 4,
        fontFamily: 'var(--font-display)', fontSize: w >= 80 ? 11 : 9,
        color: 'rgba(255,255,255,0.78)', lineHeight: 1.3,
        writingMode: 'vertical-rl', textOrientation: 'upright',
      }}>
        {b.title}
      </div>
    </div>
  );
}

// Tiny recents entry
function DictEntry({ q, compact = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: compact ? '6px 0' : '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: compact ? 15 : 17, color: 'var(--fg)', minWidth: compact ? 36 : 44, lineHeight: 1 }}>{q.head}</span>
      <span style={{ fontSize: 10.5, color: 'var(--fg-muted)', fontFamily: 'var(--font-display)', minWidth: 54 }}>{q.reading}</span>
      <span style={{ fontSize: 11.5, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{q.gloss}</span>
      {q.saved && <Ic.Star size={10} style={{ color: 'var(--accent)', flexShrink: 0 }}/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// A mini animated demo of the bottom nav — a calm, decorative element
// that teaches the interaction. Not interactive in the home page; it's
// a looping illustration.
// ═══════════════════════════════════════════════════════════════════
function NavDemo({ size = 'md' }) {
  // Sizes
  const scale = size === 'sm' ? 0.82 : size === 'lg' ? 1.12 : 1;
  const items = [
    { k: 'library', I: Ic.Library, dot: '#B5A27C' },
    { k: 'reader', I: Ic.BookOpen, dot: '#D97757', active: true },
    { k: 'dict', I: Ic.Search, dot: '#4B7AA3', active: true },
    { k: 'decks', I: Ic.Cards, dot: '#8FB08A' },
    { k: 'study', I: Ic.Sparkles, dot: '#C78A4F' },
  ];
  const plain = [
    { k: 'home', I: Ic.Home, active: true },
    { k: 'profile', I: Ic.User },
    { k: 'settings', I: Ic.Settings },
  ];
  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: 'center', display: 'inline-block' }}>
      <div style={{
        background: 'rgba(255,255,255,0.98)', border: '1px solid var(--border)', borderRadius: 14,
        boxShadow: '0 12px 32px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.04)',
        padding: 5, display: 'inline-flex', alignItems: 'center', gap: 3,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {items.map(it => (
            <div key={it.k} style={{
              width: 28, height: 28, borderRadius: 8,
              background: it.active ? 'var(--bg-sunken)' : 'transparent',
              border: it.active ? `1px solid ${it.dot}55` : '1px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: it.active ? 'var(--fg)' : 'var(--fg-muted)', position: 'relative',
            }}>
              <it.I size={14}/>
              {it.active && (
                <span style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: 99, background: it.dot }}/>
              )}
            </div>
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 3px' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {plain.map(it => (
            <div key={it.k} style={{
              width: 26, height: 26, borderRadius: 7,
              background: it.active ? 'var(--bg-sunken)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: it.active ? 'var(--fg)' : 'var(--fg-subtle)',
            }}>
              <it.I size={12}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Reading-progress rail: last book + tiny circle for others.
function ProgressRail({ books, show = 4 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {books.slice(0, show).map((b, i) => {
        const r = 14, c = 2 * Math.PI * r, off = c * (1 - b.progress / 100);
        return (
          <div key={i} title={`${b.title} · ${b.progress}%`} style={{ position: 'relative', width: 32, height: 32 }}>
            <svg width="32" height="32" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
              <circle cx="16" cy="16" r={r} stroke="var(--border)" strokeWidth="1.5" fill="none"/>
              <circle cx="16" cy="16" r={r} stroke={b.progress === 100 ? '#81C784' : 'var(--accent)'} strokeWidth="1.5" fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"/>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--fg)' }}>
              {b.title.slice(0, 1)}
            </div>
          </div>
        );
      })}
      {books.length > show && (
        <div style={{ width: 32, height: 32, borderRadius: 99, border: '1px dashed var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, color: 'var(--fg-muted)', fontFamily: 'ui-monospace, monospace' }}>
          +{books.length - show}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// V1 · QUIET
// Single hero column. Big welcoming headline in the centre. Beneath it:
// a spacious "where would you like to start?" row with 5 destinations,
// then currently-reading, then a soft recent-lookups strip. Lots of air.
// ═══════════════════════════════════════════════════════════════════
function HomeQuiet() {
  return (
    <div className="theme-default" style={{ width: '100%', height: '100%', background: 'var(--bg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div className="lgc-scroll" style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '88px 48px 160px', textAlign: 'center' }}>
          {/* welcome */}
          <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 18, fontFamily: 'var(--font-ui)' }}>
            Langeco · 語境
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, margin: 0, letterSpacing: '-0.025em', lineHeight: 1.05 }}>
            Welcome back, {HOME2_USER.name}.
          </h1>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 400, margin: '14px 0 0', letterSpacing: '-0.015em', color: 'var(--fg-muted)', fontStyle: 'italic' }}>
            Where would you like to start?
          </h2>
          <div style={{ fontSize: 13.5, color: 'var(--fg-muted)', marginTop: 18, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.65 }}>
            No schedule, no streak to protect. Pick a place that feels right today — your reading and your notes will be here when you come back.
          </div>

          {/* destinations — soft row */}
          <div style={{ marginTop: 54, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
            {HOME2_DESTINATIONS.map(d => (
              <button key={d.k} style={{
                background: 'transparent', border: '1px solid var(--border)', borderRadius: 14,
                padding: '20px 14px 18px', textAlign: 'center', cursor: 'pointer', transition: 'background 160ms',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                fontFamily: 'var(--font-ui)', color: 'var(--fg)',
              }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: `color-mix(in oklab, ${d.dot} 12%, transparent)`, color: d.dot, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <d.I size={20}/>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, letterSpacing: '-0.01em' }}>{d.l}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.45, minHeight: 32 }}>{d.desc}</div>
              </button>
            ))}
          </div>

          {/* currently reading — one card, left-aligned, feels like a bookshelf */}
          <div style={{ marginTop: 64, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                <div style={{ fontSize: 10.5, color: 'var(--accent)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>Currently</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, margin: 0, letterSpacing: '-0.01em' }}>Your last read</h3>
              </div>
              <ProgressRail books={window.BookData.libraryBooks}/>
            </div>
            <div style={{ display: 'flex', gap: 22, padding: 20, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 14, cursor: 'pointer' }}>
              <Cover b={HOME2_CURRENT} w={82} h={116}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>Chapter 1 · page 34</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, marginTop: 4, letterSpacing: '-0.01em' }}>{HOME2_CURRENT.title}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{HOME2_CURRENT.author}</div>
                <div style={{ fontSize: 12.5, color: 'var(--fg)', marginTop: 12, fontFamily: 'var(--font-display)', lineHeight: 1.55, opacity: 0.82 }}>
                  「私はその人の記憶を呼び起すごとに、すぐ『先生』といいたくなる。」
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                  <div style={{ flex: 1, maxWidth: 260, height: 2, background: 'var(--bg-sunken)', borderRadius: 99 }}>
                    <div style={{ width: `${HOME2_CURRENT.progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }}/>
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--fg-muted)', fontFamily: 'ui-monospace, monospace' }}>{HOME2_CURRENT.progress}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* recent lookups — as a thin horizontal strip, no urgency */}
          <div style={{ marginTop: 44, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 10 }}>
              <div style={{ fontSize: 10.5, color: 'var(--accent)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>Recent</div>
              <div style={{ fontSize: 13.5, color: 'var(--fg-muted)' }}>words you've looked up lately</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: 28 }}>
              {HOME2_DICT.slice(0, 6).map((q, i) => <DictEntry key={i} q={q}/>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// V2 · FIELD GUIDE
// Two-column: left is the "learn the app" column — prose explaining
// how to use the bottom nav with a live demo illustration; right is
// currently reading + recent lookups. More editorial feel.
// ═══════════════════════════════════════════════════════════════════
function HomeFieldGuide() {
  return (
    <div className="theme-default" style={{ width: '100%', height: '100%', background: 'var(--bg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="lgc-scroll" style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '52px 48px 140px' }}>
          {/* Welcome */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, fontFamily: 'var(--font-ui)' }}>Langeco · a field guide</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 400, margin: '10px 0 0', letterSpacing: '-0.025em', lineHeight: 1.05, maxWidth: 760 }}>
              Hello, {HOME2_USER.name}. <span style={{ color: 'var(--fg-muted)', fontStyle: 'italic' }}>Where would you like to start?</span>
            </h1>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 48, marginTop: 44 }}>
            {/* LEFT — field guide */}
            <div>
              {/* Nav demo */}
              <div style={{ padding: '26px 22px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 18 }}>How to move around</div>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
                  <NavDemo size="lg"/>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, textAlign: 'center', marginTop: 4 }}>
                  Your nav. Always at the bottom.
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.65, marginTop: 20, maxWidth: 460 }}>
                  Five places on the left — <span style={{ color: 'var(--fg)' }}>Library, Reader, Dictionary, Decks, Study</span>. Tap one to open it, tap again to close. Drag to reorder. Open two at once for a split view; open a third if you like.
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.65, marginTop: 10, maxWidth: 460 }}>
                  On the right, <span style={{ color: 'var(--fg)' }}>Home, Profile, Settings</span> — small windows that float open without taking over the view.
                </div>
              </div>

              {/* Destinations — as a tidy list with short copy */}
              <div style={{ marginTop: 32 }}>
                <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>What's in here</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {HOME2_DESTINATIONS.map((d, i) => (
                    <div key={d.k} style={{ display: 'flex', gap: 16, padding: '14px 0', borderTop: i === 0 ? '1px solid var(--border)' : 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', alignItems: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: `color-mix(in oklab, ${d.dot} 14%, transparent)`, color: d.dot, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <d.I size={16}/>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, letterSpacing: '-0.01em' }}>{d.l}</div>
                        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{d.desc}</div>
                      </div>
                      <Ic.ChevronRight size={13} style={{ color: 'var(--fg-subtle)' }}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — personal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {/* Currently reading */}
              <div>
                <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>Currently reading</div>
                <div style={{ display: 'flex', gap: 18, padding: 18, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer' }}>
                  <Cover b={HOME2_CURRENT} w={72} h={100}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em' }}>{HOME2_CURRENT.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{HOME2_CURRENT.author} · ch. 1, page 34</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                      <div style={{ flex: 1, height: 2, background: 'var(--bg-sunken)', borderRadius: 99 }}>
                        <div style={{ width: `${HOME2_CURRENT.progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }}/>
                      </div>
                      <span style={{ fontSize: 10.5, color: 'var(--fg-muted)', fontFamily: 'ui-monospace, monospace' }}>{HOME2_CURRENT.progress}%</span>
                    </div>
                  </div>
                </div>
                {/* small progress rail below */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, paddingLeft: 2 }}>
                  <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>Library</div>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
                  <ProgressRail books={window.BookData.libraryBooks}/>
                </div>
              </div>

              {/* Recent lookups */}
              <div>
                <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Recent lookups</div>
                <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 12, padding: '4px 14px' }}>
                  {HOME2_DICT.slice(0, 5).map((q, i) => <DictEntry key={i} q={q}/>)}
                </div>
                <a style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 11.5, color: 'var(--fg-muted)', cursor: 'pointer' }}>
                  Open dictionary <Ic.ChevronRight size={11}/>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// V3 · ATRIUM
// Centered greeting + four destination cards in a 2×2 grid (each with
// a tiny illustrative demo of that feature). Currently-reading strip
// at the top, recent lookups tucked along the right side.
// ═══════════════════════════════════════════════════════════════════
function MiniDemo({ kind }) {
  // Tiny feature illustrations — calm, reduced
  if (kind === 'reader') {
    return (
      <div style={{ width: '100%', height: 82, background: 'var(--bg-sunken)', borderRadius: 8, padding: '10px 14px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--fg)', lineHeight: 1.5 }}>
          私はその人の<span style={{ background: 'color-mix(in oklab, var(--accent) 28%, transparent)', padding: '0 2px' }}>記憶</span>を呼び起すごとに…
        </div>
        <div style={{ height: 4 }}/>
        <div style={{ position: 'absolute', right: 10, top: 8, padding: '3px 6px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 5, fontSize: 9, color: 'var(--fg-muted)', fontFamily: 'ui-monospace, monospace' }}>
          きおく · memory
        </div>
      </div>
    );
  }
  if (kind === 'dict') {
    return (
      <div style={{ width: '100%', height: 82, background: 'var(--bg-sunken)', borderRadius: 8, padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, color: 'var(--fg)', lineHeight: 1 }}>鎌</div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'var(--font-display)' }}>かま · sickle</div>
          <div style={{ height: 2, background: 'var(--border)', borderRadius: 99, width: '80%' }}/>
          <div style={{ height: 2, background: 'var(--border)', borderRadius: 99, width: '60%' }}/>
          <div style={{ height: 2, background: 'var(--border)', borderRadius: 99, width: '70%' }}/>
        </div>
      </div>
    );
  }
  if (kind === 'decks') {
    return (
      <div style={{ width: '100%', height: 82, background: 'var(--bg-sunken)', borderRadius: 8, padding: 10, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
        {['心', '文', '銀'].map((c, i) => (
          <div key={i} style={{
            width: 48, height: 60, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--fg)',
            transform: `translateY(${i === 1 ? '-4px' : '0'}) rotate(${i === 0 ? '-3deg' : i === 2 ? '3deg' : '0deg'})`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          }}>{c}</div>
        ))}
      </div>
    );
  }
  if (kind === 'study') {
    return (
      <div style={{ width: '100%', height: 82, background: 'var(--bg-sunken)', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, textAlign: 'center', color: 'var(--fg)', lineHeight: 1 }}>先生</div>
        <div style={{ fontSize: 10, color: 'var(--fg-muted)', textAlign: 'center', fontFamily: 'var(--font-display)' }}>せんせい</div>
        <div style={{ flex: 1 }}/>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, height: 20, background: 'color-mix(in oklab, #D97757 12%, var(--bg-elev))', border: '1px solid color-mix(in oklab, #D97757 30%, var(--border))', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#D97757', fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>again</div>
          <div style={{ flex: 1, height: 20, background: 'color-mix(in oklab, #8FB08A 14%, var(--bg-elev))', border: '1px solid color-mix(in oklab, #8FB08A 30%, var(--border))', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#5E8B5A', fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>good</div>
          <div style={{ flex: 1, height: 20, background: 'color-mix(in oklab, #4B7AA3 14%, var(--bg-elev))', border: '1px solid color-mix(in oklab, #4B7AA3 30%, var(--border))', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#4B7AA3', fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>easy</div>
        </div>
      </div>
    );
  }
  return null;
}

function HomeAtrium() {
  const features = HOME2_DESTINATIONS.filter(d => d.k !== 'library'); // 4 cards for 2×2
  return (
    <div className="theme-default" style={{ width: '100%', height: '100%', background: 'var(--bg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="lgc-scroll" style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '56px 48px 140px' }}>
          {/* Header — centered */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, fontFamily: 'var(--font-ui)' }}>Langeco · 語境</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 400, margin: '12px 0 0', letterSpacing: '-0.025em', lineHeight: 1.05 }}>
              Welcome back, {HOME2_USER.name}.
            </h1>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontStyle: 'italic', color: 'var(--fg-muted)', marginTop: 8 }}>
              Where would you like to start?
            </div>
          </div>

          {/* Currently reading — compact wide strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 36, cursor: 'pointer' }}>
            <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Currently</div>
            <Cover b={HOME2_CURRENT} w={54} h={76}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, letterSpacing: '-0.01em' }}>{HOME2_CURRENT.title} <span style={{ color: 'var(--fg-muted)', fontSize: 12, fontWeight: 400 }}>· {HOME2_CURRENT.author} · ch. 1 · p. 34</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <div style={{ flex: 1, maxWidth: 280, height: 2, background: 'var(--bg-sunken)', borderRadius: 99 }}>
                  <div style={{ width: `${HOME2_CURRENT.progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }}/>
                </div>
                <span style={{ fontSize: 10.5, color: 'var(--fg-muted)', fontFamily: 'ui-monospace, monospace' }}>{HOME2_CURRENT.progress}%</span>
              </div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
              <div style={{ fontSize: 9.5, color: 'var(--fg-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Library</div>
              <ProgressRail books={window.BookData.libraryBooks} show={4}/>
            </div>
          </div>

          {/* Atrium — 2x2 destination cards + recent lookups sidebar */}
          <div style={{ display: 'grid', gridTemplateColumns: '2.3fr 1fr', gap: 28, alignItems: 'start' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {features.map(d => (
                <div key={d.k} style={{
                  background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 14,
                  padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: `color-mix(in oklab, ${d.dot} 14%, transparent)`, color: d.dot, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <d.I size={17}/>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em' }}>{d.l}</div>
                    </div>
                    <Ic.ChevronRight size={13} style={{ color: 'var(--fg-subtle)' }}/>
                  </div>
                  <MiniDemo kind={d.k}/>
                  <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', lineHeight: 1.5 }}>{d.desc}</div>
                </div>
              ))}
            </div>

            {/* Recent lookups — tucked column */}
            <div>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Recent lookups</div>
              <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 12, padding: '4px 14px' }}>
                {HOME2_DICT.slice(0, 5).map((q, i) => <DictEntry key={i} q={q} compact/>)}
              </div>

              {/* Nav demo as calming footer illustration */}
              <div style={{ marginTop: 22, padding: '18px 14px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>Your nav</div>
                <NavDemo size="sm"/>
                <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 12, lineHeight: 1.55 }}>
                  Tap to open. Drag to reorder. Open two at once for split view.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomeQuiet, HomeFieldGuide, HomeAtrium, NavDemo });
