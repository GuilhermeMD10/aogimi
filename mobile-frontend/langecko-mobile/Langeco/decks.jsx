// Decks — overview (2 variations) + deck detail (card grid) + edit modal

const deckData = [
  { id: 1, name: 'Kokoro — Ch. 1', desc: 'Words and phrases from the opening chapter.', cards: 42, due: 12, img: '#6B5A45', kamon: '心', accentColor: 'var(--accent)', tag: 'こゝろ · 夏目 漱石', previews: ['鎌倉', '先生', '記憶'] },
  { id: 2, name: 'N2 Grammar Pack', desc: 'Essential N2 grammar patterns with examples.', cards: 180, due: 28, img: '#2E5D4E', kamon: '文', accentColor: 'var(--accent-2)', tag: 'grammar · JLPT', previews: ['〜によって', '〜ばかりか', '〜にもかかわらず'] },
  { id: 3, name: 'Miyazawa Kenji', desc: 'Vocabulary across Kenji\'s short stories.', cards: 96, due: 6, img: '#263B5C', kamon: '銀', accentColor: 'var(--accent-3)', tag: 'literature · short stories', previews: ['料理店', '銀河', '鉄道'] },
  { id: 4, name: 'Daily Kanji — 18', desc: 'Kanji encountered while reading this week.', cards: 28, due: 0, img: '#8E3B36', kamon: '漢', accentColor: 'var(--accent)', tag: 'auto-generated · weekly', previews: ['鎌', '倉', '墓'] },
  { id: 5, name: 'Keigo basics', desc: 'Polite, humble, and honorific forms.', cards: 54, due: 3, img: '#4A4038', kamon: '敬', accentColor: 'var(--accent-2)', tag: 'grammar · speech', previews: ['いらっしゃる', '申し上げる', 'ご覧'] },
  { id: 6, name: 'Taisho-era prose', desc: 'Classical words from early 20th-century authors.', cards: 64, due: 15, img: '#7A5330', kamon: '古', accentColor: 'var(--accent-3)', tag: 'literature · classical', previews: ['書生', '墓地', '茶屋'] },
];

function DecksShell({ theme = 'default', children, showSidebar = true }) {
  const textureMap = { default: '', kanagawa: 'kanagawa-texture', sakura: 'sakura-texture', hanami: 'hanami-texture' };
  return (
    <div className={`theme-${theme} ${textureMap[theme] || ''}`} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {showSidebar && <DecksIconRail theme={theme}/>}
        <div style={{ flex: 1, overflow: 'auto' }} className="lgc-scroll">
          {children}
        </div>
      </div>
    </div>
  );
}

function DecksIconRail({ theme }) {
  const crestChar = { default: 'L', kanagawa: '波' }[theme] || 'L';
  return (
    <div style={{ width: 52, borderRight: '1px solid var(--border)', background: 'var(--bg-sunken)', padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{crestChar}</div>
      {[Ic.Home, Ic.Library, Ic.BookOpen, Ic.Cards, Ic.Search, Ic.Stars].map((Icn, i) => (
        <button key={i} className="lgc-icon-btn" style={{ width: 34, height: 34, background: i === 3 ? 'var(--bg-elev)' : 'transparent', color: i === 3 ? 'var(--accent)' : undefined, border: i === 3 ? '1px solid var(--border)' : 'none' }}>
          <Icn size={16}/>
        </button>
      ))}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
        <button className="lgc-icon-btn" style={{ width: 34, height: 34 }}><Ic.Settings size={16}/></button>
        <div style={{ width: 26, height: 26, borderRadius: 99, background: 'linear-gradient(135deg, var(--accent), var(--accent-2, var(--accent)))' }}/>
      </div>
    </div>
  );
}

function DecksHeader({ subtitle }) {
  return (
    <div style={{ padding: '28px 36px 6px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6, fontFamily: 'var(--font-ui)' }}>Flashcards</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 500, margin: 0, letterSpacing: '-0.015em' }}>Your decks</h1>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 6 }}>{subtitle}</div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="lgc-btn lgc-btn-ghost"><Ic.Filter size={13}/> Filter</button>
        <button className="lgc-btn lgc-btn-ghost">Sort</button>
        <button className="lgc-btn lgc-btn-outline"><Ic.Plus size={13}/> New deck</button>
      </div>
    </div>
  );
}

// ─────────────── Variation A — visual grid with image + mini cards ───────────────

function DeckCardA({ d }) {
  return (
    <div className="lgc-card" style={{ overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'transform 150ms' }}>
      {/* Cover image */}
      <div style={{
        height: 120, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${d.img} 0%, color-mix(in oklab, ${d.img} 60%, black) 100%)`,
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, transparent 0 12px, rgba(255,255,255,0.04) 12px 13px)' }}/>
        <div style={{ position: 'absolute', bottom: 12, left: 14, fontFamily: 'var(--font-display)', fontSize: 44, color: 'rgba(255,255,255,0.85)', lineHeight: 1 }}>{d.kamon}</div>
        <div style={{ position: 'absolute', top: 10, right: 10, padding: '3px 8px', borderRadius: 99, background: 'rgba(0,0,0,0.35)', color: 'white', fontSize: 10, fontFamily: 'Geist Mono, monospace' }}>
          {d.cards} cards
        </div>
        {d.due > 0 && (
          <div style={{ position: 'absolute', top: 10, left: 10, padding: '3px 8px', borderRadius: 99, background: 'var(--accent)', color: 'white', fontSize: 10, fontWeight: 600 }}>
            {d.due} due
          </div>
        )}
      </div>
      <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, color: 'var(--fg)', marginBottom: 2 }}>{d.name}</div>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 10 }}>{d.tag}</div>
        <div style={{ fontSize: 12, color: 'var(--fg)', lineHeight: 1.5, marginBottom: 12, flex: 1 }}>{d.desc}</div>
        {/* 3 mini card previews */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {d.previews.map((p, i) => (
            <div key={i} style={{
              flex: 1, padding: '10px 6px', border: '1px solid var(--border)', borderRadius: 4,
              background: 'var(--bg-sunken)',
              fontFamily: 'var(--font-display)', fontSize: 14, textAlign: 'center', color: 'var(--fg)',
            }}>{p}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="lgc-btn lgc-btn-primary" style={{ flex: 1 }}>Study {d.due > 0 ? `· ${d.due}` : ''}</button>
          <button className="lgc-icon-btn" style={{ border: '1px solid var(--border)' }}><Ic.MoreHorizontal size={14}/></button>
        </div>
      </div>
    </div>
  );
}

function DecksOverviewA({ theme = 'default' }) {
  return (
    <DecksShell theme={theme}>
      <DecksHeader subtitle="6 decks · 464 total cards · 64 due today"/>
      <div style={{ padding: '20px 36px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          {deckData.map(d => <DeckCardA key={d.id} d={d}/>)}
        </div>
      </div>
    </DecksShell>
  );
}


// ─────────────── Deck detail — grid of mini card previews ───────────────

const deckCards = [
  { jp: '鎌倉', rd: 'かまくら', en: 'Kamakura (city)', lvl: 'N2', state: 'new' },
  { jp: '先生', rd: 'せんせい', en: 'teacher, mentor', lvl: 'N5', state: 'learning' },
  { jp: '記憶', rd: 'きおく', en: 'memory', lvl: 'N2', state: 'mastered' },
  { jp: '心持', rd: 'こころもち', en: 'feeling, sentiment', lvl: 'N1', state: 'new' },
  { jp: '憚かる', rd: 'はばかる', en: 'to hesitate, defer to', lvl: 'N1', state: 'learning' },
  { jp: '書生', rd: 'しょせい', en: 'student (old-fashioned)', lvl: 'N2', state: 'new' },
  { jp: '工面', rd: 'くめん', en: 'to manage, scrape together', lvl: 'N1', state: 'learning' },
  { jp: '暑中', rd: 'しょちゅう', en: 'mid-summer', lvl: 'N2', state: 'mastered' },
  { jp: '海水浴', rd: 'かいすいよく', en: 'sea-bathing', lvl: 'N2', state: 'new' },
  { jp: '端書', rd: 'はがき', en: 'postcard', lvl: 'N3', state: 'learning' },
  { jp: '打ち明ける', rd: 'うちあける', en: 'to confide, reveal', lvl: 'N1', state: 'new' },
  { jp: '若々しい', rd: 'わかわかしい', en: 'youthful', lvl: 'N2', state: 'mastered' },
];

const stateColor = {
  new: { bg: 'var(--accent-soft)', fg: 'var(--accent)', label: 'New' },
  learning: { bg: 'rgba(242, 179, 61, 0.18)', fg: '#B8802A', label: 'Learning' },
  mastered: { bg: 'rgba(129, 199, 132, 0.22)', fg: '#3B7A40', label: 'Mastered' },
};

function MiniCard({ c, onEdit, highlight }) {
  const s = stateColor[c.state];
  return (
    <div
      onClick={onEdit}
      style={{
        background: 'var(--bg-elev)', border: highlight ? '2px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: 8, padding: 14, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 6, position: 'relative',
        transition: 'transform 120ms, box-shadow 120ms',
        aspectRatio: '4 / 3',
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ padding: '2px 7px', borderRadius: 99, background: s.bg, color: s.fg, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {s.label}
        </div>
        <div style={{ fontSize: 10, color: 'var(--fg-subtle)', fontFamily: 'Geist Mono, monospace' }}>{c.lvl}</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--fg)', lineHeight: 1, marginBottom: 4, letterSpacing: '-0.01em' }}>{c.jp}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--fg-muted)' }}>{c.rd}</div>
      </div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, fontSize: 11, color: 'var(--fg-muted)', textAlign: 'center', minHeight: 28 }}>
        {c.en}
      </div>
    </div>
  );
}

function DeckDetail({ theme = 'default', showEditModal = false }) {
  const textureMap = { default: '', kanagawa: 'kanagawa-texture', sakura: 'sakura-texture', hanami: 'hanami-texture' };
  const d = deckData[0];
  const editCard = deckCards[0];
  return (
    <div className={`theme-${theme} ${textureMap[theme] || ''}`} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <DecksIconRail theme={theme}/>
        <div className="lgc-scroll" style={{ flex: 1, overflow: 'auto' }}>
          {/* Breadcrumb + deck header */}
          <div style={{ padding: '20px 32px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)', marginBottom: 20 }}>
              <Ic.ArrowLeft size={12}/>
              <span>Decks</span>
              <span style={{ opacity: 0.5 }}>/</span>
              <span style={{ color: 'var(--fg)' }}>{d.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 10 }}>
              <div style={{
                width: 80, height: 80, borderRadius: 10, position: 'relative', overflow: 'hidden', flexShrink: 0,
                background: `linear-gradient(135deg, ${d.img} 0%, color-mix(in oklab, ${d.img} 50%, black) 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-display)', fontSize: 44,
              }}>{d.kamon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>{d.tag}</div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 500, margin: 0, letterSpacing: '-0.015em' }}>{d.name}</h1>
                <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 6, maxWidth: 520 }}>{d.desc}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="lgc-btn lgc-btn-outline"><Ic.Plus size={13}/> New card</button>
                <button className="lgc-btn lgc-btn-ghost"><Ic.Share size={13}/> Share</button>
                <button className="lgc-btn lgc-btn-primary"><Ic.Cards size={13}/> Study {d.due} due</button>
              </div>
            </div>
            {/* Stats strip */}
            <div style={{ display: 'flex', gap: 28, padding: '16px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--fg-muted)' }}>
              <Stat label="Total" value={d.cards}/>
              <Stat label="New" value={18} accent/>
              <Stat label="Learning" value={12}/>
              <Stat label="Mastered" value={12}/>
              <Stat label="Due today" value={d.due} accent/>
              <div style={{ flex: 1 }}/>
            </div>
          </div>

          {/* Filter row */}
          <div style={{ padding: '16px 32px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {['All', 'New', 'Learning', 'Mastered'].map((f, i) => (
                <button key={f} className="lgc-chip" style={{
                  cursor: 'pointer',
                  background: i === 0 ? 'var(--accent)' : 'var(--bg-sunken)',
                  color: i === 0 ? 'white' : 'var(--fg-muted)',
                  padding: '5px 11px', fontSize: 12,
                }}>{f}</button>
              ))}
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 6, maxWidth: 300 }}>
              <Ic.Search size={12}/>
              <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Filter cards…</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'Geist Mono, monospace' }}>Grid</div>
            <div style={{ display: 'flex', padding: 2, background: 'var(--bg-sunken)', borderRadius: 6 }}>
              <button className="lgc-icon-btn" style={{ width: 26, height: 24, background: 'var(--bg-elev)', color: 'var(--fg)' }}><Ic.Grid size={12}/></button>
              <button className="lgc-icon-btn" style={{ width: 26, height: 24 }}><Ic.List size={12}/></button>
            </div>
          </div>

          {/* Card grid */}
          <div style={{ padding: '0 32px 40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {deckCards.map((c, i) => (
                <MiniCard key={i} c={c} highlight={showEditModal && i === 0}/>
              ))}
              <div style={{
                aspectRatio: '4 / 3', border: '2px dashed var(--border-strong)', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4,
                color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 12,
              }}>
                <Ic.Plus size={18}/>
                <div>New card</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {showEditModal && <EditCardModal c={editCard} theme={theme}/>}
    </div>
  );
}

function Stat({ label, value, accent, mono = true }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 18, color: accent ? 'var(--accent)' : 'var(--fg)', fontFamily: mono ? 'Geist Mono, monospace' : 'inherit', fontWeight: 500, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function EditCardModal({ c, theme }) {
  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }}/>
      {/* Modal */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 560, maxHeight: '86%', background: 'var(--bg-elev)',
        border: '1px solid var(--border-strong)', borderRadius: 12,
        boxShadow: '0 28px 56px -12px rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column', zIndex: 41, overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>Edit card</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>Kokoro — Ch. 1 · card 1 of 42</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button className="lgc-icon-btn"><Ic.ChevronLeft size={14}/></button>
            <button className="lgc-icon-btn"><Ic.ChevronRight size={14}/></button>
            <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }}/>
            <button className="lgc-icon-btn"><Ic.X size={14}/></button>
          </div>
        </div>

        <div className="lgc-scroll" style={{ padding: 20, overflow: 'auto', flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Front</div>
          <div style={{ padding: 16, border: '1px solid var(--border-strong)', borderRadius: 10, background: 'var(--bg)', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginBottom: 4 }}>Kanji / word</div>
                <input defaultValue={c.jp} style={{
                  width: '100%', fontFamily: 'var(--font-display)', fontSize: 30,
                  border: 'none', background: 'transparent', outline: 'none', color: 'var(--fg)', padding: '4px 0',
                  borderBottom: '1px dashed var(--border-strong)',
                }}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginBottom: 4 }}>Reading</div>
                <input defaultValue={c.rd} style={{
                  width: '100%', fontFamily: 'var(--font-display)', fontSize: 18,
                  border: 'none', background: 'transparent', outline: 'none', color: 'var(--fg)', padding: '4px 0',
                  borderBottom: '1px dashed var(--border-strong)',
                }}/>
              </div>
              <button className="lgc-icon-btn" style={{ alignSelf: 'flex-end', marginBottom: 6 }}><Ic.Volume size={14}/></button>
            </div>
          </div>

          <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Back</div>
          <div style={{ padding: 14, border: '1px solid var(--border-strong)', borderRadius: 10, background: 'var(--bg)', marginBottom: 14 }}>
            <textarea defaultValue="Kamakura — coastal city in Kanagawa Prefecture, south of Tokyo.&#10;Capital during the Kamakura period (1185–1333)." style={{
              width: '100%', minHeight: 70, border: 'none', outline: 'none', resize: 'vertical',
              fontFamily: 'inherit', fontSize: 13, color: 'var(--fg)', background: 'transparent', lineHeight: 1.55,
            }}/>
          </div>

          <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Context from book</div>
          <div style={{ padding: 10, background: 'var(--bg-sunken)', borderRadius: 6, fontFamily: 'var(--font-display)', fontSize: 13, lineHeight: 1.7, marginBottom: 6 }}>
            私が先生と知り合いになったのは<mark style={{ background: 'var(--accent-soft)', padding: '0 2px', color: 'var(--fg)' }}>鎌倉</mark>である。
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontStyle: 'italic', marginBottom: 14 }}>
            こゝろ · 上・一 · p. 34
          </div>

          <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Tags</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {['place', 'kamakura', 'chapter-1'].map(t => (
                  <span key={t} className="lgc-chip" style={{ cursor: 'pointer' }}>{t} <Ic.X size={9}/></span>
                ))}
                <span className="lgc-chip" style={{ cursor: 'pointer', color: 'var(--fg-subtle)' }}>+ add</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Level</div>
              <div className="lgc-chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 }}>N2 <Ic.ChevronDown size={10}/></div>
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="lgc-btn lgc-btn-ghost" style={{ color: '#B33' }}><Ic.Trash size={13}/> Delete</button>
          <div style={{ flex: 1 }}/>
          <button className="lgc-btn lgc-btn-ghost">Cancel</button>
          <button className="lgc-btn lgc-btn-primary"><Ic.Check size={13}/> Save changes</button>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { DecksOverviewA, DeckDetail, EditCardModal });
