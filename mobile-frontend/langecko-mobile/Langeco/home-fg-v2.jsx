// Langeco — Home v2 (Field Guide, iterated)
// - "What's in here" moves to hero position
// - Study is removed; 4 destinations: Reader, Dictionary, Decks, Library
// - Two opener treatments: A (literary epigraph) + B (time-of-day)
// - Bottom: two how-to cards side-by-side — nav demo + draggable split-view demo
// - Last 3 books row (latest = currently reading)

const HOME3_DICT = [
  { head: '鎌倉', reading: 'かまくら', gloss: 'Kamakura (city)', saved: true },
  { head: '書生', reading: 'しょせい', gloss: 'student (old-fashioned)' },
  { head: '記憶', reading: 'きおく', gloss: 'memory; recollection', saved: true },
  { head: '暑中', reading: 'しょちゅう', gloss: 'mid-summer' },
  { head: '憚かる', reading: 'はばかる', gloss: 'to hesitate, defer to' },
];

const HOME3_DEST = [
  { k: 'reader',  I: Ic.BookOpen, l: 'Reader',     dot: '#D97757', desc: 'Read with tap-to-look-up and inline context.' },
  { k: 'dict',    I: Ic.Search,   l: 'Dictionary', dot: '#4B7AA3', desc: 'Full JMdict entries, kanji breakdown, audio.' },
  { k: 'decks',   I: Ic.Cards,    l: 'Decks',      dot: '#8FB08A', desc: 'Flashcards built from what you read.' },
  { k: 'library', I: Ic.Library,  l: 'Library',    dot: '#B5A27C', desc: 'Your books, organised how you like.' },
];

// 3 last-read books — latest first = currently reading
const HOME3_RECENT = [
  window.BookData.libraryBooks[0], // Kokoro — currently
  window.BookData.libraryBooks[5], // Bocchan
  window.BookData.libraryBooks[1], // 注文の多い料理店
];

function CoverMini({ b, w = 54, h = 78 }) {
  return (
    <div style={{
      width: w, height: h,
      background: `linear-gradient(135deg, ${b.cover} 0%, color-mix(in oklab, ${b.cover} 50%, black) 100%)`,
      borderRadius: 3, flexShrink: 0, position: 'relative', overflow: 'hidden',
      boxShadow: '0 4px 10px rgba(0,0,0,0.16), inset 1px 0 0 rgba(255,255,255,0.08), inset -1px 0 0 rgba(0,0,0,0.2)',
    }}>
      <div style={{
        position: 'absolute', left: 3, top: 5, right: 3,
        fontFamily: 'var(--font-display)', fontSize: 8.5, color: 'rgba(255,255,255,0.78)',
        lineHeight: 1.3, writingMode: 'vertical-rl', textOrientation: 'upright',
      }}>{b.title}</div>
    </div>
  );
}

function DictEntry3({ q }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--fg)', minWidth: 36 }}>{q.head}</span>
      <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'var(--font-display)', minWidth: 50 }}>{q.reading}</span>
      <span style={{ fontSize: 11, color: 'var(--fg)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.gloss}</span>
      {q.saved && <Ic.Star size={10} style={{ color: 'var(--accent)', flexShrink: 0 }}/>}
    </div>
  );
}

// ─── Reused nav demo (compact, no Study) ─────────────────────────
function NavDemoCompact() {
  const items = [
    { I: Ic.Library, dot: '#B5A27C' },
    { I: Ic.BookOpen, dot: '#D97757', active: true },
    { I: Ic.Search, dot: '#4B7AA3', active: true },
    { I: Ic.Cards, dot: '#8FB08A' },
  ];
  const plain = [
    { I: Ic.Home, active: true },
    { I: Ic.User },
    { I: Ic.Settings },
  ];
  return (
    <div style={{
      background: 'rgba(255,255,255,0.98)', border: '1px solid var(--border)', borderRadius: 14,
      boxShadow: '0 12px 32px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.04)',
      padding: 5, display: 'inline-flex', alignItems: 'center', gap: 3,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            width: 30, height: 30, borderRadius: 8,
            background: it.active ? 'var(--bg-sunken)' : 'transparent',
            border: it.active ? `1px solid ${it.dot}55` : '1px solid transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: it.active ? 'var(--fg)' : 'var(--fg-muted)', position: 'relative',
          }}>
            <it.I size={15}/>
            {it.active && <span style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: 99, background: it.dot }}/>}
          </div>
        ))}
      </div>
      <div style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 3px' }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {plain.map((it, i) => (
          <div key={i} style={{
            width: 28, height: 28, borderRadius: 7,
            background: it.active ? 'var(--bg-sunken)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: it.active ? 'var(--fg)' : 'var(--fg-subtle)',
          }}><it.I size={13}/></div>
        ))}
      </div>
    </div>
  );
}

// ─── NEW · Split-view demo ────────────────────────────────────────
// A small figurative window showing Reader + Dictionary side by side,
// with the bottom bar indicating draggable tabs.
function SplitDemo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {/* Mini window sample */}
      <div style={{
        width: 280, height: 158, background: 'var(--bg-sunken)', border: '1px solid var(--border)',
        borderRadius: 10, overflow: 'hidden', position: 'relative',
        boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
      }}>
        {/* Left pane — Reader */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '58%',
          background: 'var(--bg)', borderRight: '1px solid var(--border)',
          padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Ic.BookOpen size={9} style={{ color: '#D97757' }}/>
            <span style={{ fontSize: 8, color: 'var(--fg-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>Reader</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--fg)', lineHeight: 1.5 }}>
            私はその人の<span style={{ background: 'color-mix(in oklab, #4B7AA3 30%, transparent)', padding: '0 2px', borderRadius: 2 }}>記憶</span>を呼び起すごとに、すぐ「先生」といいたくなる。
          </div>
          <div style={{ fontSize: 7.5, color: 'var(--fg-subtle)', lineHeight: 1.4, fontStyle: 'italic' }}>
            Whenever I summon his memory…
          </div>
        </div>
        {/* Right pane — Dictionary */}
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: '42%',
          background: 'var(--bg-elev)', padding: '10px 10px',
          display: 'flex', flexDirection: 'column', gap: 5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Ic.Search size={9} style={{ color: '#4B7AA3' }}/>
            <span style={{ fontSize: 8, color: 'var(--fg-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>Dictionary</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--fg)', lineHeight: 1 }}>記憶</span>
            <span style={{ fontSize: 8, color: 'var(--fg-muted)', fontFamily: 'var(--font-display)' }}>きおく</span>
          </div>
          <div style={{ fontSize: 8.5, color: 'var(--fg)', lineHeight: 1.45 }}>memory; recollection</div>
          <div style={{ height: 1, background: 'var(--border)', margin: '3px 0' }}/>
          <div style={{ fontSize: 7.5, color: 'var(--fg-muted)', lineHeight: 1.45 }}>記 record · 憶 remember</div>
          <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
            <span style={{ fontSize: 7, color: 'var(--fg-muted)', background: 'var(--bg-sunken)', padding: '1px 4px', borderRadius: 3, border: '1px solid var(--border)' }}>n</span>
            <span style={{ fontSize: 7, color: 'var(--fg-muted)', background: 'var(--bg-sunken)', padding: '1px 4px', borderRadius: 3, border: '1px solid var(--border)' }}>vs</span>
          </div>
        </div>
        {/* Divider handle */}
        <div style={{
          position: 'absolute', left: '58%', top: '50%', transform: 'translate(-50%, -50%)',
          width: 4, height: 30, background: 'var(--fg-subtle)', opacity: 0.35, borderRadius: 99,
        }}/>
      </div>

      {/* Bottom nav reflecting this — with drag indicator on Dictionary */}
      <div style={{
        background: 'rgba(255,255,255,0.98)', border: '1px solid var(--border)', borderRadius: 12,
        boxShadow: '0 10px 24px rgba(0,0,0,0.08)',
        padding: 4, display: 'inline-flex', alignItems: 'center', gap: 2, position: 'relative',
      }}>
        {[
          { I: Ic.Library, dot: '#B5A27C' },
          { I: Ic.BookOpen, dot: '#D97757', active: true, label: 'Reader' },
          { I: Ic.Search, dot: '#4B7AA3', active: true, label: 'Dict', dragging: true },
          { I: Ic.Cards, dot: '#8FB08A' },
        ].map((it, i) => (
          <div key={i} style={{
            width: it.active ? 'auto' : 28, height: 28, padding: it.active ? '0 8px' : 0,
            borderRadius: 7, gap: 5,
            background: it.active ? 'var(--bg-sunken)' : 'transparent',
            border: it.active ? `1px solid ${it.dot}55` : '1px solid transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: it.active ? 'var(--fg)' : 'var(--fg-muted)', position: 'relative',
            boxShadow: it.dragging ? `0 3px 10px ${it.dot}55` : 'none',
            transform: it.dragging ? 'translateY(-2px)' : 'none',
          }}>
            <it.I size={14}/>
            {it.label && <span style={{ fontSize: 10, fontWeight: 500, fontFamily: 'var(--font-ui)' }}>{it.label}</span>}
            {it.active && !it.dragging && <span style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: 99, background: it.dot }}/>}
          </div>
        ))}
        {/* Drag arrow ghost showing reorder */}
        <svg width="28" height="12" style={{ position: 'absolute', right: 28, top: -14 }}>
          <path d="M 4 6 L 22 6" stroke="var(--fg-subtle)" strokeWidth="1" strokeDasharray="2 2" fill="none"/>
          <path d="M 22 6 L 18 3 M 22 6 L 18 9" stroke="var(--fg-subtle)" strokeWidth="1" fill="none"/>
        </svg>
      </div>
    </div>
  );
}

// ─── The shared home body ────────────────────────────────────────
function HomeFGBody({ opener }) {
  const currently = HOME3_RECENT[0];
  return (
    <div className="theme-default" style={{ width: '100%', height: '100%', background: 'var(--bg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="lgc-scroll" style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '52px 48px 140px' }}>
          {/* OPENER — passed in */}
          {opener}

          {/* ═══ "WHAT'S IN HERE" — now hero ═══ */}
          <div style={{ marginTop: 40 }}>
            <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>What's in here</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {HOME3_DEST.map(d => (
                <button key={d.k} style={{
                  background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 14,
                  padding: '20px 18px', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', flexDirection: 'column', gap: 12, fontFamily: 'var(--font-ui)',
                  color: 'var(--fg)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `color-mix(in oklab, ${d.dot} 14%, transparent)`, color: d.dot, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <d.I size={18}/>
                    </div>
                    <Ic.ChevronRight size={13} style={{ color: 'var(--fg-subtle)' }}/>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em' }}>{d.l}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4, lineHeight: 1.5 }}>{d.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ═══ Currently + 3 recent books ═══ */}
          <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 40 }}>
            {/* Books */}
            <div>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>Recently opened</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {HOME3_RECENT.map((b, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 16, padding: '14px 14px',
                    background: i === 0 ? 'var(--bg-elev)' : 'transparent',
                    border: i === 0 ? '1px solid var(--border)' : '1px solid transparent',
                    borderBottom: i === 0 ? '1px solid var(--border)' : '1px solid var(--border)',
                    borderRadius: i === 0 ? 12 : 0, cursor: 'pointer', alignItems: 'center',
                    marginBottom: i === 0 ? 6 : 0,
                  }}>
                    <CoverMini b={b} w={i === 0 ? 62 : 40} h={i === 0 ? 88 : 56}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {i === 0 && (
                        <div style={{ fontSize: 9.5, color: 'var(--accent)', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>Currently reading</div>
                      )}
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: i === 0 ? 19 : 15, fontWeight: 500, letterSpacing: '-0.01em' }}>{b.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 1 }}>{b.author}{i === 0 ? ' · ch. 1, page 34' : ''}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                        <div style={{ flex: 1, maxWidth: 240, height: 2, background: 'var(--bg-sunken)', borderRadius: 99 }}>
                          <div style={{ width: `${b.progress}%`, height: '100%', background: b.progress === 100 ? '#81C784' : 'var(--accent)', borderRadius: 99 }}/>
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'ui-monospace, monospace' }}>{b.progress}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent lookups */}
            <div>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>Recent lookups</div>
              <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 12, padding: '6px 14px' }}>
                {HOME3_DICT.slice(0, 5).map((q, i) => <DictEntry3 key={i} q={q}/>)}
              </div>
              <a style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 11.5, color: 'var(--fg-muted)', cursor: 'pointer' }}>
                Open dictionary <Ic.ChevronRight size={11}/>
              </a>
            </div>
          </div>

          {/* ═══ How-to cards side-by-side ═══ */}
          <div style={{ marginTop: 56 }}>
            <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>Getting around</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {/* Card 1 — nav */}
              <div style={{ padding: '22px 22px 26px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 14, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 14px' }}>
                  <NavDemoCompact/>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 4 }}>A bottom bar, always within reach</div>
                <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                  Four places on the left — <span style={{ color: 'var(--fg)' }}>Library, Reader, Dictionary, Decks</span>. Tap to open, tap again to close. On the right, small windows float open for <span style={{ color: 'var(--fg)' }}>Home, Profile, Settings</span> without taking over.
                </div>
              </div>
              {/* Card 2 — drag / split view */}
              <div style={{ padding: '22px 22px 26px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 14, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 14px' }}>
                  <SplitDemo/>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 4 }}>Drag a tab, work in two places</div>
                <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                  Hold a tab and drag to rearrange — or pull it next to another to split the view. Read and look up a word at the same time. Drag again to collapse back.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Opener A — literary epigraph ────────────────────────────────
function OpenerLiterary() {
  return (
    <div style={{ position: 'relative', paddingBottom: 4 }}>
      <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, fontFamily: 'var(--font-ui)' }}>Langeco · 語境</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, alignItems: 'end', marginTop: 14 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--fg)', fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.25, maxWidth: 640 }}>
            「私はその人の記憶を呼び起すごとに、すぐ『先生』といいたくなる。」
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', marginTop: 10, fontStyle: 'italic', letterSpacing: '0.01em' }}>
            — 夏目漱石「こゝろ」· picked up where you left off
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--fg)' }}>
            Where to?
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 6, maxWidth: 260 }}>
            No schedule. Pick a place that feels right today.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Opener B — time-of-day, no name ─────────────────────────────
function OpenerTimeOfDay() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, fontFamily: 'var(--font-ui)' }}>Langeco · 語境</div>
        <div style={{ width: 4, height: 4, borderRadius: 99, background: 'var(--fg-subtle)' }}/>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, fontFamily: 'var(--font-ui)' }}>Tuesday afternoon · quiet hours</div>
      </div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 400, margin: '16px 0 0', letterSpacing: '-0.025em', lineHeight: 1.05 }}>
        Where would you like to start?
      </h1>
      <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 10, maxWidth: 520, lineHeight: 1.6 }}>
        Your reading and your notes are waiting. Pick a place, or carry on where you left off — nothing is overdue.
      </div>
    </div>
  );
}

function HomeFG_A() { return <HomeFGBody opener={<OpenerLiterary/>}/>; }
function HomeFG_B() { return <HomeFGBody opener={<OpenerTimeOfDay/>}/>; }

Object.assign(window, { HomeFG_A, HomeFG_B });
