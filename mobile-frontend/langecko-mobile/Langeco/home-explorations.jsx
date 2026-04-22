// Three Home-page directions combining Library + Decks + Dictionary as
// shortcut sections. Library is no longer a draggable workspace pane —
// it lives inside Home. Clicking a book opens the Reader; clicking a
// deck opens the full Decks page at that deck; clicking a dictionary
// item opens the dictionary entry.
//
// Framing: these render inside the app shell (no icon rail — the
// new bottom nav replaces it), and the bottom nav floats over them.

const HOME_USER = { name: 'Lucas', level: 'N2', streak: 14, studied: 2340 };

// small helpers ─────────────────────────────────────────────────────
function SectionHead({ kicker, title, count, action = 'See all' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <div style={{ fontSize: 10.5, color: 'var(--accent)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>{kicker}</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
        {count != null && <span style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'ui-monospace, monospace' }}>{count}</span>}
      </div>
      <a style={{ fontSize: 12, color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
        {action} <Ic.ChevronRight size={11}/>
      </a>
    </div>
  );
}

function GreetingBand() {
  const now = new Date();
  const hour = 14; // fake steady for preview
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6, fontFamily: 'var(--font-ui)' }}>Home · {new Date().toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 500, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          {greeting}, {HOME_USER.name}.
        </h1>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 8, maxWidth: 480, lineHeight: 1.5 }}>
          You're on a <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{HOME_USER.streak}-day streak</span>. 12 cards due in <span style={{ color: 'var(--fg)' }}>Kokoro — Ch. 1</span>. Pick up where you left off.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <StatChip label="Streak" value={HOME_USER.streak} suffix="d"/>
        <StatChip label="Words" value="847"/>
        <StatChip label="Level" value={HOME_USER.level}/>
      </div>
    </div>
  );
}

function StatChip({ label, value, suffix }) {
  return (
    <div style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-elev)', textAlign: 'center', minWidth: 58 }}>
      <div style={{ fontSize: 16, fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--fg)', lineHeight: 1 }}>
        {value}
        {suffix && <span style={{ fontSize: 10, color: 'var(--fg-muted)', marginLeft: 1 }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: 9, color: 'var(--fg-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginTop: 3 }}>{label}</div>
    </div>
  );
}

// Book tile — used everywhere
function BookTile({ b, size = 'md' }) {
  const dims = { sm: { w: 42, h: 58 }, md: { w: 54, h: 74 }, lg: { w: 88, h: 122 } }[size];
  return (
    <div style={{
      width: dims.w, height: dims.h, background: `linear-gradient(135deg, ${b.cover} 0%, color-mix(in oklab, ${b.cover} 50%, black) 100%)`,
      borderRadius: 3, flexShrink: 0,
      boxShadow: '0 4px 10px rgba(0,0,0,0.18), inset 1px 0 0 rgba(255,255,255,0.08), inset -1px 0 0 rgba(0,0,0,0.2)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', left: 4, top: 6, right: 4, fontFamily: 'var(--font-display)', fontSize: size === 'lg' ? 10 : 8, color: 'rgba(255,255,255,0.75)', lineHeight: 1.3, writingMode: 'vertical-rl', textOrientation: 'upright' }}>
        {b.title}
      </div>
    </div>
  );
}

// Deck mini-card (used in rows)
function DeckMini({ d, compact = false }) {
  return (
    <div style={{
      background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 10,
      padding: compact ? 10 : 12, display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer',
      minWidth: compact ? 220 : 240,
    }}>
      <div style={{
        width: compact ? 34 : 42, height: compact ? 34 : 42, borderRadius: 7,
        background: `linear-gradient(135deg, ${d.img} 0%, color-mix(in oklab, ${d.img} 55%, black) 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.92)', fontFamily: 'var(--font-display)', fontSize: compact ? 17 : 22, flexShrink: 0,
      }}>{d.kamon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: compact ? 12.5 : 13.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
        <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', marginTop: 2, display: 'flex', gap: 8 }}>
          <span>{d.cards} cards</span>
          {d.due > 0 && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>· {d.due} due</span>}
        </div>
      </div>
    </div>
  );
}

// Dictionary recent row
function DictRow({ q, compact = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: compact ? '7px 10px' : '9px 12px', borderRadius: 7, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-elev)' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: compact ? 16 : 18, color: 'var(--fg)', lineHeight: 1, minWidth: compact ? 32 : 40 }}>{q.head}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', fontFamily: 'var(--font-display)' }}>{q.reading}</div>
        <div style={{ fontSize: 11.5, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.gloss}</div>
      </div>
      {q.saved && <Ic.Star size={11} style={{ color: 'var(--accent)' }}/>}
    </div>
  );
}

// Shared data for the home pages
const HOME_BOOKS = window.BookData.libraryBooks;
const HOME_DECKS = [
  { id: 1, name: 'Kokoro — Ch. 1', cards: 42, due: 12, img: '#6B5A45', kamon: '心' },
  { id: 2, name: 'N2 Grammar Pack', cards: 180, due: 28, img: '#2E5D4E', kamon: '文' },
  { id: 3, name: 'Miyazawa Kenji', cards: 96, due: 6, img: '#263B5C', kamon: '銀' },
  { id: 4, name: 'Daily Kanji — 18', cards: 28, due: 0, img: '#8E3B36', kamon: '漢' },
  { id: 5, name: 'Keigo basics', cards: 54, due: 3, img: '#4A4038', kamon: '敬' },
];
const HOME_DICT = [
  { head: '鎌倉', reading: 'かまくら', gloss: 'Kamakura (city)', saved: true },
  { head: '書生', reading: 'しょせい', gloss: 'student (old-fashioned)' },
  { head: '記憶', reading: 'きおく', gloss: 'memory; recollection', saved: true },
  { head: '暑中', reading: 'しょちゅう', gloss: 'mid-summer', saved: false },
  { head: '憚かる', reading: 'はばかる', gloss: 'to hesitate, defer to' },
  { head: '工面', reading: 'くめん', gloss: 'to scrape together, manage' },
];

// ═══════════════════════════════════════════════════════════════════
// H1 · ATELIER — editorial column with hero continue-reading card +
// three horizontally-scrolling sections. Calm, reading-first feel.
// ═══════════════════════════════════════════════════════════════════
function HomeAtelier() {
  const current = HOME_BOOKS[0]; // Kokoro
  return (
    <div className="theme-default" style={{ width: '100%', height: '100%', background: 'var(--bg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="lgc-scroll" style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 44px 120px' }}>
          <GreetingBand/>

          {/* Continue reading — big hero tile that doubles as the Library entry point */}
          <div style={{ marginTop: 28, marginBottom: 34 }}>
            <SectionHead kicker="Continue" title="Currently reading" count={`2 books`} action="Library"/>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
              {/* main */}
              <div style={{ display: 'flex', gap: 18, padding: 20, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 14, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                <BookTile b={current} size="lg"/>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--accent)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>Chapter 1 · page 34</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, marginTop: 4, letterSpacing: '-0.01em' }}>{current.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{current.author}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg)', marginTop: 12, lineHeight: 1.55, fontFamily: 'var(--font-display)' }}>
                    「私はその人の記憶を呼び起すごとに、すぐ『先生』といいたくなる。」
                  </div>
                  <div style={{ flex: 1 }}/>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                    <div style={{ flex: 1, height: 3, background: 'var(--bg-sunken)', borderRadius: 99 }}>
                      <div style={{ width: `${current.progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }}/>
                    </div>
                    <span style={{ fontSize: 10.5, color: 'var(--fg-muted)', fontFamily: 'ui-monospace, monospace' }}>{current.progress}%</span>
                    <button className="lgc-btn lgc-btn-primary" style={{ fontSize: 12, padding: '6px 12px' }}>
                      <Ic.BookOpen size={12}/> Resume
                    </button>
                  </div>
                </div>
              </div>
              {/* secondary currently reading */}
              <div style={{ display: 'flex', gap: 12, padding: 16, background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 14, cursor: 'pointer' }}>
                <BookTile b={HOME_BOOKS[1]} size="md"/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>Also reading</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, marginTop: 3 }}>{HOME_BOOKS[1].title}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{HOME_BOOKS[1].author}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                    <div style={{ flex: 1, height: 2, background: 'var(--border)', borderRadius: 99 }}>
                      <div style={{ width: `${HOME_BOOKS[1].progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }}/>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'ui-monospace, monospace' }}>{HOME_BOOKS[1].progress}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Library row — horizontal scroll of books */}
          <div style={{ marginBottom: 34 }}>
            <SectionHead kicker="Library" title="Your books" count={`${HOME_BOOKS.length}`} action="Open library"/>
            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '4px 2px 8px', scrollbarWidth: 'thin' }}>
              {HOME_BOOKS.map((b, i) => (
                <div key={i} style={{ width: 144, flexShrink: 0, cursor: 'pointer' }}>
                  <BookTile b={b} size="lg"/>
                  <div style={{ marginTop: 10, fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 500, lineHeight: 1.25, color: 'var(--fg)' }}>{b.title}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', marginTop: 2 }}>{b.author}</div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, height: 2, background: 'var(--border)', borderRadius: 99 }}>
                      <div style={{ width: `${b.progress}%`, height: '100%', background: b.progress === 100 ? '#81C784' : 'var(--accent)', borderRadius: 99 }}/>
                    </div>
                    <span style={{ fontSize: 9.5, color: 'var(--fg-muted)', fontFamily: 'ui-monospace, monospace' }}>{b.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Decks row */}
          <div style={{ marginBottom: 34 }}>
            <SectionHead kicker="Flashcards" title="Due today" count={`${HOME_DECKS.filter(d=>d.due>0).length} decks`} action="All decks"/>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '2px 2px 8px', scrollbarWidth: 'thin' }}>
              {HOME_DECKS.map(d => <DeckMini key={d.id} d={d}/>)}
            </div>
          </div>

          {/* Dictionary recents */}
          <div>
            <SectionHead kicker="Dictionary" title="Recent lookups" count={`${HOME_DICT.length}`} action="Open dictionary"/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {HOME_DICT.map((q, i) => <DictRow key={i} q={q}/>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// H2 · TRI-COLUMN BOARD — Library / Decks / Dictionary as three
// parallel columns. Each is a compact list. Great for glancing at all
// three domains at once; no horizontal scrolling.
// ═══════════════════════════════════════════════════════════════════
function HomeTriColumn() {
  return (
    <div className="theme-default" style={{ width: '100%', height: '100%', background: 'var(--bg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="lgc-scroll" style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 40px 120px' }}>
          <GreetingBand/>

          {/* Continue-reading compact strip — single wide card */}
          <div style={{ marginTop: 24, marginBottom: 28, display: 'flex', gap: 14, padding: 16, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', alignItems: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Continue</div>
            <BookTile b={HOME_BOOKS[0]} size="md"/>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em' }}>{HOME_BOOKS[0].title} <span style={{ color: 'var(--fg-muted)', fontSize: 13, fontWeight: 400 }}>· ch. 1 · page 34</span></div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 3 }}>{HOME_BOOKS[0].author}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <div style={{ flex: 1, maxWidth: 260, height: 3, background: 'var(--bg-sunken)', borderRadius: 99 }}>
                  <div style={{ width: `${HOME_BOOKS[0].progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }}/>
                </div>
                <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'ui-monospace, monospace' }}>{HOME_BOOKS[0].progress}%</span>
              </div>
            </div>
            <button className="lgc-btn lgc-btn-primary" style={{ fontSize: 12 }}><Ic.BookOpen size={12}/> Resume</button>
          </div>

          {/* Three columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: 18 }}>
            {/* LIBRARY COLUMN */}
            <TriColumn
              kicker="Library" title="Books" count={`${HOME_BOOKS.length}`} accent="#B5A27C"
              action={{ label: 'Open library', icon: Ic.Library }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {HOME_BOOKS.slice(0, 5).map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                    <BookTile b={b} size="sm"/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.author} · {b.level}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <div style={{ flex: 1, height: 2, background: 'var(--bg-sunken)', borderRadius: 99 }}>
                          <div style={{ width: `${b.progress}%`, height: '100%', background: b.progress === 100 ? '#81C784' : 'var(--accent)', borderRadius: 99 }}/>
                        </div>
                        <span style={{ fontSize: 9.5, color: 'var(--fg-muted)', fontFamily: 'ui-monospace, monospace' }}>{b.progress}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TriColumn>

            {/* DECKS COLUMN */}
            <TriColumn
              kicker="Decks" title="Due today" count={HOME_DECKS.filter(d=>d.due>0).length + ' decks'} accent="#8FB08A"
              action={{ label: 'All decks', icon: Ic.Cards }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {HOME_DECKS.slice(0, 5).map(d => (
                  <DeckMini key={d.id} d={d} compact/>
                ))}
              </div>
            </TriColumn>

            {/* DICTIONARY COLUMN */}
            <TriColumn
              kicker="Dictionary" title="Recent & saved" count={`${HOME_DICT.length}`} accent="#4B7AA3"
              action={{ label: 'Open dictionary', icon: Ic.Search }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {/* search bar stub */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-elev)', border: '1px solid var(--border)', marginBottom: 4 }}>
                  <Ic.Search size={12}/>
                  <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Search dictionary…</span>
                  <kbd style={{ marginLeft: 'auto', fontSize: 9, fontFamily: 'ui-monospace, monospace', padding: '1px 4px', border: '1px solid var(--border-strong)', borderRadius: 3, color: 'var(--fg-muted)' }}>⌘K</kbd>
                </div>
                {HOME_DICT.slice(0, 5).map((q, i) => <DictRow key={i} q={q} compact/>)}
              </div>
            </TriColumn>
          </div>
        </div>
      </div>
    </div>
  );
}

function TriColumn({ kicker, title, count, accent, action, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: `2px solid ${accent}` }}>
        <div style={{ fontSize: 10, color: accent, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>{kicker}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, margin: 0, letterSpacing: '-0.01em' }}>{title} <span style={{ fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 400, fontFamily: 'ui-monospace, monospace', marginLeft: 6 }}>{count}</span></h2>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {children}
      </div>
      <a style={{ marginTop: 12, fontSize: 11.5, color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
        {action.icon && <action.icon size={11}/>}
        {action.label} <Ic.ChevronRight size={10}/>
      </a>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// H3 · BENTO — modern dashboard grid. Continue-reading is the hero
// tile, flanked by "due decks" and "recent lookups" tiles. Stats strip
// at top, library row below. Glance-friendly.
// ═══════════════════════════════════════════════════════════════════
function HomeBento() {
  const current = HOME_BOOKS[0];
  return (
    <div className="theme-default" style={{ width: '100%', height: '100%', background: 'var(--bg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="lgc-scroll" style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '36px 40px 120px' }}>
          {/* Header with greeting + inline stats */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Home · {new Date().toLocaleDateString('en', { weekday: 'long' })}</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 500, margin: 0, letterSpacing: '-0.02em' }}>Good afternoon, {HOME_USER.name}.</h1>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <StatChip label="Streak" value={HOME_USER.streak} suffix="d"/>
              <StatChip label="Due" value="34"/>
              <StatChip label="Words" value="847"/>
            </div>
          </div>

          {/* Bento grid: 4 columns x variable rows */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridAutoRows: 'minmax(auto, auto)', gap: 14 }}>
            {/* HERO · continue reading · 4 cols wide, 2 rows tall */}
            <div style={{ gridColumn: 'span 4', gridRow: 'span 2',
              background: `linear-gradient(135deg, ${current.cover} 0%, color-mix(in oklab, ${current.cover} 45%, #100C08) 100%)`,
              borderRadius: 16, padding: 22, color: 'white', position: 'relative', overflow: 'hidden',
              display: 'flex', gap: 22, cursor: 'pointer', minHeight: 260,
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, transparent 0 14px, rgba(255,255,255,0.04) 14px 15px)' }}/>
              <BookTile b={current} size="lg"/>
              <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>Continue · ch. 1 · p. 34</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 500, marginTop: 8, letterSpacing: '-0.01em' }}>{current.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>{current.author}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)', marginTop: 16, lineHeight: 1.55, fontFamily: 'var(--font-display)', maxWidth: 380 }}>
                  「私はその人の記憶を呼び起すごとに、すぐ『先生』といいたくなる。」
                </div>
                <div style={{ flex: 1 }}/>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
                  <div style={{ flex: 1, maxWidth: 200, height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 99 }}>
                    <div style={{ width: `${current.progress}%`, height: '100%', background: 'white', borderRadius: 99 }}/>
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontFamily: 'ui-monospace, monospace' }}>{current.progress}%</span>
                  <button style={{
                    padding: '7px 14px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(10px)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
                  }}><Ic.BookOpen size={12}/> Resume reading</button>
                </div>
              </div>
            </div>

            {/* DUE DECKS · 2 cols, 1 row */}
            <div style={{ gridColumn: 'span 2', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 9.5, color: '#8FB08A', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>Decks</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, marginTop: 2 }}>Due today</div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 500, color: 'var(--accent)', lineHeight: 1 }}>49</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                {HOME_DECKS.filter(d => d.due > 0).slice(0, 3).map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 4, background: `linear-gradient(135deg, ${d.img}, color-mix(in oklab, ${d.img} 55%, black))`, color: 'white', fontFamily: 'var(--font-display)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{d.kamon}</div>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 11.5, fontFamily: 'var(--font-display)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--accent)', fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>{d.due}</div>
                  </div>
                ))}
              </div>
              <button className="lgc-btn lgc-btn-primary" style={{ marginTop: 10, fontSize: 11.5, justifyContent: 'center' }}>
                <Ic.Cards size={11}/> Study all
              </button>
            </div>

            {/* RECENT LOOKUPS · 2 cols, 1 row */}
            <div style={{ gridColumn: 'span 2', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9.5, color: '#4B7AA3', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>Dictionary</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, marginTop: 2 }}>Recent lookups</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, background: 'var(--bg-sunken)', border: '1px solid var(--border)', marginBottom: 8 }}>
                <Ic.Search size={11}/>
                <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>Search…</span>
                <kbd style={{ marginLeft: 'auto', fontSize: 9, fontFamily: 'ui-monospace, monospace', padding: '1px 4px', border: '1px solid var(--border-strong)', borderRadius: 3, color: 'var(--fg-muted)' }}>⌘K</kbd>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {HOME_DICT.slice(0, 4).map((q, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '3px 0' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--fg)', minWidth: 30 }}>{q.head}</span>
                    <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'var(--font-display)', minWidth: 46 }}>{q.reading}</span>
                    <span style={{ fontSize: 11, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{q.gloss}</span>
                    {q.saved && <Ic.Star size={10} style={{ color: 'var(--accent)', flexShrink: 0 }}/>}
                  </div>
                ))}
              </div>
            </div>

            {/* LIBRARY WIDE ROW · 6 cols */}
            <div style={{ gridColumn: 'span 6', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 9.5, color: '#B5A27C', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>Library</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, marginTop: 2 }}>Your books <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', color: 'var(--fg-subtle)', fontWeight: 400, marginLeft: 6 }}>{HOME_BOOKS.length}</span></div>
                </div>
                <a style={{ fontSize: 11.5, color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Open library <Ic.ChevronRight size={11}/>
                </a>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
                {HOME_BOOKS.slice(0, 6).map((b, i) => (
                  <div key={i} style={{ cursor: 'pointer' }}>
                    <BookTile b={b} size="lg"/>
                    <div style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 500, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.author}</div>
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ flex: 1, height: 2, background: 'var(--bg-sunken)', borderRadius: 99 }}>
                        <div style={{ width: `${b.progress}%`, height: '100%', background: b.progress === 100 ? '#81C784' : 'var(--accent)', borderRadius: 99 }}/>
                      </div>
                      <span style={{ fontSize: 9, color: 'var(--fg-muted)', fontFamily: 'ui-monospace, monospace' }}>{b.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomeAtelier, HomeTriColumn, HomeBento });
