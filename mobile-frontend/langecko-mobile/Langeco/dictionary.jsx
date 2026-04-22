// Full-screen Dictionary — search results list + detail entry

function DictionaryShell({ theme = 'default', children }) {
  const textureMap = { default: '', kanagawa: 'kanagawa-texture', sakura: 'sakura-texture', hanami: 'hanami-texture' };
  return (
    <div className={`theme-${theme} ${textureMap[theme] || ''}`} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  );
}

function DictTopBar({ query = '鎌倉', backLabel }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
      borderBottom: '1px solid var(--border)',
      background: 'color-mix(in oklab, var(--bg) 85%, transparent)',
      backdropFilter: 'blur(10px)',
    }}>
      {backLabel && (
        <button className="lgc-btn lgc-btn-ghost" style={{ padding: '4px 8px' }}>
          <Ic.ArrowLeft size={14}/> {backLabel}
        </button>
      )}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 8,
        background: 'var(--bg-elev)', border: '1px solid var(--border-strong)',
        maxWidth: 540,
      }}>
        <Ic.Search size={14}/>
        <input
          defaultValue={query}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--fg)',
          }}/>
        <kbd style={{ fontSize: 10, fontFamily: 'Geist Mono, monospace', padding: '2px 5px', border: '1px solid var(--border-strong)', borderRadius: 3, color: 'var(--fg-muted)' }}>⌘K</kbd>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
        <button className="lgc-btn lgc-btn-ghost" style={{ fontSize: 12 }}>JA → EN</button>
        <button className="lgc-icon-btn"><Ic.Filter size={14}/></button>
        <button className="lgc-icon-btn"><Ic.Clock size={14}/></button>
      </div>
    </div>
  );
}

// ─────────────── Search-results view ───────────────

const dictResults = [
  {
    head: '鎌倉', reading: 'かまくら', pos: 'place, noun', level: 'N2',
    glosses: ['Kamakura (coastal city in Kanagawa Prefecture)', 'Kamakura period (1185–1333)'],
    tags: ['proper noun', 'place', 'history'], common: true,
  },
  {
    head: '鎌', reading: 'かま', pos: 'noun', level: 'N1',
    glosses: ['Sickle; scythe', 'Part of a hot-water kettle'],
    tags: ['tool', 'kanji'], common: false,
  },
  {
    head: '鎌倉時代', reading: 'かまくらじだい', pos: 'noun', level: 'N1',
    glosses: ['The Kamakura period (1185–1333); the era of the first shogunate'],
    tags: ['history', 'period'], common: false,
  },
  {
    head: '鎌倉幕府', reading: 'かまくらばくふ', pos: 'noun', level: 'N1',
    glosses: ['The Kamakura shogunate; military government established by Minamoto no Yoritomo'],
    tags: ['history', 'government'], common: false,
  },
  {
    head: '鎌首', reading: 'かまくび', pos: 'noun', level: '—',
    glosses: ['Neck curved like a sickle (e.g. of a snake ready to strike)'],
    tags: ['figurative'], common: false,
  },
];

function ResultCard({ r, i, active }) {
  return (
    <div style={{
      display: 'flex', gap: 16, padding: '16px 18px',
      borderBottom: '1px solid var(--border)',
      background: active ? 'var(--bg-elev)' : 'transparent',
      borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
      cursor: 'pointer',
    }}>
      <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: 'var(--fg-subtle)', paddingTop: 6, minWidth: 18 }}>
        {String(i + 1).padStart(2, '0')}
      </div>
      <div style={{ minWidth: 140, textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1, letterSpacing: '-0.01em', color: 'var(--fg)' }}>
            {r.head}
          </div>
          {r.common && (
            <div title="Common" style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--accent)' }}/>
          )}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>
          {r.reading}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
          <span className="lgc-chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 }}>{r.level}</span>
          <span className="lgc-chip">{r.pos}</span>
          {r.tags.map(t => <span key={t} className="lgc-chip">{t}</span>)}
        </div>
        <ol style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13.5, lineHeight: 1.55, color: 'var(--fg)' }}>
          {r.glosses.map((g, gi) => (
            <li key={gi} style={{ marginBottom: 2 }}>{g}</li>
          ))}
        </ol>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        <button className="lgc-icon-btn" title="Add to flashcards"><Ic.Plus size={14}/></button>
        <button className="lgc-icon-btn" title="Audio"><Ic.Volume size={14}/></button>
      </div>
    </div>
  );
}

function DictionarySearch({ theme = 'default' }) {
  return (
    <DictionaryShell theme={theme}>
      <DictTopBar query="鎌倉"/>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Left: search history / filters */}
        <div style={{ width: 220, borderRight: '1px solid var(--border)', padding: '14px 12px', background: 'color-mix(in oklab, var(--bg-sunken) 40%, transparent)', overflow: 'auto' }} className="lgc-scroll">
          <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, padding: '4px 8px 6px' }}>Filter by level</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 6px 14px' }}>
            {['All', 'N5', 'N4', 'N3', 'N2', 'N1'].map((n, i) => (
              <button key={n} className="lgc-chip" style={{
                cursor: 'pointer',
                background: i === 0 ? 'var(--accent)' : 'var(--bg-sunken)',
                color: i === 0 ? (theme === 'hanami' ? 'var(--bg)' : 'white') : 'var(--fg-muted)',
                padding: '3px 10px',
              }}>{n}</button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, padding: '8px 8px 6px' }}>Recent</div>
          {['先生', '暑中休暇', '書生', '記憶', 'こゝろ'].map(q => (
            <div key={q} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', fontSize: 13, color: 'var(--fg-muted)', borderRadius: 6, cursor: 'pointer' }}>
              <Ic.Clock size={11}/>
              <span style={{ fontFamily: 'var(--font-display)' }}>{q}</span>
            </div>
          ))}
          <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, padding: '16px 8px 6px' }}>Saved · 24</div>
          {['鎌倉', '侍', '桜'].map(q => (
            <div key={q} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', fontSize: 13, color: 'var(--fg)', borderRadius: 6, cursor: 'pointer' }}>
              <Ic.Star size={11} style={{ color: 'var(--accent)' }}/>
              <span style={{ fontFamily: 'var(--font-display)' }}>{q}</span>
            </div>
          ))}
        </div>

        {/* Main: results */}
        <div className="lgc-scroll" style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ padding: '18px 18px 6px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Dictionary</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em' }}>
                5 results for <span style={{ color: 'var(--accent)' }}>「鎌倉」</span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'Geist Mono, monospace' }}>
              sort · relevance ↓
            </div>
          </div>
          <div style={{ padding: '4px 18px 12px', fontSize: 12, color: 'var(--fg-muted)' }}>
            Showing JMdict entries · kanji, reading, and cross-reference matches
          </div>
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {dictResults.map((r, i) => <ResultCard key={i} r={r} i={i} active={i === 0}/>)}
          </div>
          <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--fg-subtle)' }}>
            End of results · <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>Search DeepL</span>
          </div>
        </div>
      </div>
    </DictionaryShell>
  );
}

// ─────────────── Detail (full entry) view ───────────────

function DictionaryDetail({ theme = 'default' }) {
  return (
    <DictionaryShell theme={theme}>
      <DictTopBar query="鎌倉" backLabel="Results"/>
      <div className="lgc-scroll" style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 32px 60px' }}>
          {/* Hero */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 6 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 84, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--fg)' }}>
              鎌倉
            </div>
            <div style={{ paddingBottom: 14, flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--fg-muted)' }}>かまくら</div>
              <div style={{ fontSize: 13, color: 'var(--fg-subtle)', marginTop: 2, fontFamily: 'Geist Mono, monospace' }}>ka·ma·ku·ra  · [L]H·H·H</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                <span className="lgc-chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 }}>N2</span>
                <span className="lgc-chip">proper noun</span>
                <span className="lgc-chip">place</span>
                <span className="lgc-chip">common</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 12 }}>
              <button className="lgc-btn lgc-btn-primary"><Ic.Plus size={13}/> Add to deck</button>
              <button className="lgc-btn lgc-btn-outline"><Ic.Volume size={13}/> Play audio</button>
              <button className="lgc-btn lgc-btn-ghost"><Ic.Star size={13}/> Save word</button>
            </div>
          </div>

          {/* Meanings */}
          <SectionHead num="01" title="Meanings"/>
          <div style={{ marginBottom: 32 }}>
            {[
              { en: 'Kamakura — coastal city in Kanagawa Prefecture, south of Tokyo.', note: 'geography · primary sense' },
              { en: 'Kamakura period (1185–1333) — the era of Japan\'s first shogunate under the Minamoto clan.', note: 'history' },
              { en: 'A traditional snow hut (かまくら), built in winter festivals of northern Japan.', note: 'homophone · separate entry' },
            ].map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'Geist Mono, monospace', color: 'var(--accent)', fontSize: 13, fontWeight: 600, paddingTop: 2 }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--fg)' }}>{m.en}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 3, fontStyle: 'italic' }}>{m.note}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Kanji breakdown */}
          <SectionHead num="02" title="Kanji breakdown"/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
            {[
              { c: '鎌', meaning: 'sickle', on: 'ケン', kun: 'かま', strokes: 18, jlpt: 'N1', radicals: '金 · 兼' },
              { c: '倉', meaning: 'warehouse, storehouse', on: 'ソウ', kun: 'くら', strokes: 10, jlpt: 'N2', radicals: '人 · 口' },
            ].map(k => (
              <div key={k.c} className="lgc-card" style={{ padding: 16, display: 'flex', gap: 16 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 72, lineHeight: 1, color: 'var(--fg)', width: 88, textAlign: 'center', borderRight: '1px solid var(--border)', paddingRight: 12 }}>{k.c}</div>
                <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.7 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{k.meaning}</div>
                  <Row label="On" value={k.on}/>
                  <Row label="Kun" value={k.kun}/>
                  <Row label="Strokes" value={k.strokes}/>
                  <Row label="JLPT" value={k.jlpt}/>
                  <Row label="Radicals" value={k.radicals}/>
                </div>
              </div>
            ))}
          </div>

          {/* Example from book */}
          <SectionHead num="03" title="Example — from your reading"/>
          <div style={{ padding: '14px 18px', background: 'var(--bg-sunken)', borderRadius: 8, borderLeft: '3px solid var(--accent)', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 8, fontFamily: 'var(--font-ui)' }}>
              こゝろ · 夏目 漱石 · 上・一 鎌倉の海 · p. 34
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, lineHeight: 1.8, color: 'var(--fg)' }}>
              私が先生と知り合いになったのは<mark style={{ background: 'var(--accent-soft)', padding: '0 2px', color: 'var(--fg)' }}>鎌倉</mark>である。その時私はまだ若々しい書生であった。
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 8, fontStyle: 'italic' }}>
              I met Sensei in Kamakura. I was still a youthful student at the time.
            </div>
          </div>

          {/* Related */}
          <SectionHead num="04" title="Related"/>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
            {[
              { jp: '鎌倉時代', en: 'Kamakura period' },
              { jp: '鎌倉幕府', en: 'Kamakura shogunate' },
              { jp: '神奈川', en: 'Kanagawa Prefecture' },
              { jp: '武士', en: 'samurai / warrior' },
              { jp: '源頼朝', en: 'Minamoto no Yoritomo' },
            ].map(r => (
              <div key={r.jp} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, background: 'var(--bg-elev)', cursor: 'pointer' }}>
                <span style={{ fontFamily: 'var(--font-display)', marginRight: 8, color: 'var(--fg)' }}>{r.jp}</span>
                <span style={{ color: 'var(--fg-muted)' }}>{r.en}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', fontSize: 11, color: 'var(--fg-subtle)' }}>
            Source · JMdict · Jisho · DeepL
          </div>
        </div>
      </div>
    </DictionaryShell>
  );
}

function SectionHead({ num, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
      <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 600 }}>{num}</div>
      <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600 }}>{title}</div>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <div style={{ color: 'var(--fg-muted)', width: 64, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
      <div style={{ color: 'var(--fg)', fontFamily: label === 'On' || label === 'Kun' || label === 'Radicals' ? 'var(--font-display)' : 'Geist Mono, monospace', fontSize: 13 }}>{value}</div>
    </div>
  );
}

Object.assign(window, { DictionarySearch, DictionaryDetail });
