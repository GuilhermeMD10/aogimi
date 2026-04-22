// Main library page (03.b style list) + Modular (tabs + split view) — 3 themes.

function Shell({ theme = 'kanagawa' }) {
  const { libraryBooks } = window.BookData;
  const textureMap = { default: '', kanagawa: 'kanagawa-texture', sakura: 'sakura-texture', hanami: 'hanami-texture' };
  const crestChar = { default: 'L', kanagawa: '波', sakura: '桜', hanami: '祭' }[theme];
  const tagline = { default: 'read · learn', kanagawa: '波の向こうに', sakura: '桜の下で読む', hanami: '灯りの読書' }[theme];

  return (
    <div className={`theme-${theme} ${textureMap[theme] || ''}`} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Slim icon rail */}
        <div style={{ width: 52, borderRight: '1px solid var(--border)', background: 'var(--bg-sunken)', padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme === 'hanami' ? 'var(--bg)' : 'white', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{crestChar}</div>
          {[Ic.Home, Ic.Library, Ic.BookOpen, Ic.Cards, Ic.Search, Ic.Stars].map((Icn, i) => (
            <button key={i} className="lgc-icon-btn" style={{ width: 34, height: 34, background: i === 1 ? 'var(--bg-elev)' : 'transparent', color: i === 1 ? 'var(--accent)' : undefined, border: i === 1 ? '1px solid var(--border)' : 'none' }}>
              <Icn size={16}/>
            </button>
          ))}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            <button className="lgc-icon-btn" style={{ width: 34, height: 34 }}><Ic.Settings size={16}/></button>
            <div style={{ width: 26, height: 26, borderRadius: 99, background: `linear-gradient(135deg, var(--accent), var(--accent-2, var(--accent)))` }}/>
          </div>
        </div>

        {/* Panel list */}
        <div style={{ width: 260, borderRight: '1px solid var(--border)', padding: '16px 12px', display: 'flex', flexDirection: 'column', background: 'color-mix(in oklab, var(--bg-sunken) 50%, transparent)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '4px 8px 12px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em' }}>Langeco</span>
            <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-display)' }}>{tagline}</span>
          </div>
          <div className="lgc-input" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', marginBottom: 10 }}>
            <Ic.Search size={12}/>
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)', flex: 1 }}>Filter library</span>
            <kbd style={{ fontSize: 9, fontFamily: 'Geist Mono, monospace', padding: '1px 4px', border: '1px solid var(--border-strong)', borderRadius: 3, color: 'var(--fg-muted)' }}>/</kbd>
          </div>
          <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, padding: '8px 8px 4px' }}>In progress · 3</div>
          {libraryBooks.filter(b => b.progress > 0 && b.progress < 100).map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, background: i === 0 ? 'var(--bg-elev)' : 'transparent', border: i === 0 ? '1px solid var(--border)' : '1px solid transparent' }}>
              <div style={{ width: 14, height: 20, background: b.cover, borderRadius: 2, flexShrink: 0 }}/>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--fg)', fontFamily: 'var(--font-display)' }}>{b.title}</div>
                <div style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{b.progress}%</div>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, padding: '14px 8px 4px' }}>Up next</div>
          {libraryBooks.filter(b => b.progress === 0).map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 6, fontSize: 12.5, color: 'var(--fg-muted)' }}>
              <div style={{ width: 14, height: 20, background: b.cover, borderRadius: 2, opacity: 0.6 }}/>
              <span style={{ fontFamily: 'var(--font-display)' }}>{b.title}</span>
            </div>
          ))}
          <div style={{ marginTop: 'auto', padding: '10px 8px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: 99, background: 'linear-gradient(135deg, var(--accent), var(--accent-3, var(--accent-2, var(--accent))))' }}/>
            <div style={{ flex: 1, fontSize: 12 }}>
              <div style={{ fontWeight: 500 }}>Lucas</div>
              <div style={{ color: 'var(--fg-muted)', fontSize: 10 }}>日本語 · N2</div>
            </div>
            <Ic.Settings size={13}/>
          </div>
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, overflow: 'auto', padding: '28px 36px' }} className="lgc-scroll">
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6, fontFamily: 'var(--font-ui)' }}>Library</div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 500, margin: 0, letterSpacing: '-0.015em' }}>Your books</h1>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button className="lgc-btn lgc-btn-ghost">Filter</button>
                <button className="lgc-btn lgc-btn-ghost">Sort</button>
                <button className="lgc-btn lgc-btn-outline"><Ic.Plus size={13}/> Import EPUB</button>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 24 }}>6 books</div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-elev)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 80px 70px 140px 36px', padding: '10px 14px', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
                <span/><span>Title</span><span>Level</span><span style={{ textAlign: 'right' }}>Pages</span><span>Progress</span><span/>
              </div>
              {libraryBooks.map((b, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 80px 70px 140px 36px', padding: '11px 14px', alignItems: 'center', fontSize: 13, borderBottom: i < libraryBooks.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                  <div style={{ width: 20, height: 26, background: b.cover, borderRadius: 2 }}/>
                  <div>
                    <div style={{ color: 'var(--fg)', fontFamily: 'var(--font-display)', fontSize: 14 }}>{b.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{b.author}</div>
                  </div>
                  <div><span className="lgc-chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{b.level}</span></div>
                  <div style={{ textAlign: 'right', color: 'var(--fg-muted)', fontFamily: 'Geist Mono, monospace' }}>412</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: 'var(--bg-sunken)', borderRadius: 99 }}>
                      <div style={{ width: `${b.progress}%`, height: '100%', background: b.progress === 100 ? 'var(--fg-muted)' : 'var(--accent)', borderRadius: 99 }}/>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'Geist Mono, monospace', minWidth: 28, textAlign: 'right' }}>{b.progress}%</span>
                  </div>
                  <div style={{ textAlign: 'right', color: 'var(--fg-muted)' }}><Ic.MoreHorizontal size={14}/></div>
                </div>
              ))}
            </div>

            {/* Placeholder for future stats section (streaks/time intentionally excluded) */}
            <div style={{ marginTop: 32, padding: '20px 22px', border: '1px dashed var(--border-strong)', borderRadius: 10, color: 'var(--fg-subtle)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Ic.Sparkles size={14}/>
              <span>Reading stats · coming later</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────── Modular view: tab bar + split ───────────
function DictionaryPane({ compact = false }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-elev)' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Ic.Search size={14}/>
        <div className="lgc-input" style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '4px 8px', fontSize: 12 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>鎌倉</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--fg-subtle)' }}>kamakura</span>
        </div>
      </div>
      <div className="lgc-scroll" style={{ flex: 1, overflow: 'auto', padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 500, letterSpacing: '-0.01em' }}>鎌倉</div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', fontFamily: 'var(--font-display)' }}>かまくら</div>
          <button className="lgc-icon-btn" style={{ marginLeft: 'auto' }}><Ic.Volume size={14}/></button>
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          <span className="lgc-chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>N2</span>
          <span className="lgc-chip">noun</span>
          <span className="lgc-chip">place</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>Meaning</div>
        <ol style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, lineHeight: 1.55 }}>
          <li style={{ marginBottom: 6 }}>Kamakura — coastal city in Kanagawa Prefecture, south of Tokyo.</li>
          <li>Kamakura period (1185–1333)</li>
        </ol>
        {!compact && (
          <>
            <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginTop: 18, marginBottom: 6 }}>Example (from book)</div>
            <div style={{ padding: 10, background: 'var(--bg-sunken)', borderRadius: 6, borderLeft: '2px solid var(--accent)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, lineHeight: 1.7 }}>
                私が先生と知り合いになったのは<mark style={{ background: 'var(--accent-soft)', padding: '0 2px', color: 'var(--fg)' }}>鎌倉</mark>である。
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4, fontStyle: 'italic' }}>I met Sensei in Kamakura.</div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginTop: 18, marginBottom: 6 }}>Kanji</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ c: '鎌', on: 'ケン', kun: 'かま' }, { c: '倉', on: 'ソウ', kun: 'くら' }].map(k => (
                <div key={k.c} style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 6, flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, textAlign: 'center', lineHeight: 1 }}>{k.c}</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-muted)', textAlign: 'center', marginTop: 6 }}>音 {k.on} · 訓 {k.kun}</div>
                </div>
              ))}
            </div>
          </>
        )}
        <div style={{ marginTop: 18, display: 'flex', gap: 6 }}>
          <button className="lgc-btn lgc-btn-primary" style={{ flex: 1 }}><Ic.Plus size={13}/> Flashcard</button>
          <button className="lgc-btn lgc-btn-outline"><Ic.Languages size={13}/> DeepL</button>
        </div>
      </div>
    </div>
  );
}

function FlashcardPane() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-elev)' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Ic.Cards size={14}/>
        <div style={{ fontSize: 12, fontWeight: 600 }}>New card</div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
          <span style={{ color: 'var(--fg-muted)' }}>Deck</span>
          <div className="lgc-input" style={{ padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: 2, background: 'var(--accent)' }}/>
            Kokoro — Ch. 1 <Ic.ChevronDown size={11}/>
          </div>
        </div>
      </div>
      <div className="lgc-scroll" style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span>Front</span><span style={{ color: 'var(--accent)' }}>● Auto-filled</span>
        </div>
        <div style={{ padding: 18, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg)', marginBottom: 14, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, lineHeight: 1, marginBottom: 6 }}>鎌倉</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>かまくら</div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>Back</div>
        <div style={{ padding: 14, border: '1px dashed var(--border-strong)', borderRadius: 10, background: 'var(--bg)', marginBottom: 14, minHeight: 80 }}>
          <div style={{ fontSize: 14 }}>Kamakura — coastal city in Kanagawa.</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 6, fontStyle: 'italic' }}>Capital during the Kamakura period (1185–1333).</div>
          <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }}/>
          <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Type your own notes…</div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>Context (from reader)</div>
        <div style={{ padding: 10, background: 'var(--bg-sunken)', borderRadius: 6, fontFamily: 'var(--font-display)', fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>
          私が先生と知り合いになったのは<mark style={{ background: 'var(--accent-soft)', padding: '0 2px', color: 'var(--fg)' }}>鎌倉</mark>である。
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="lgc-btn lgc-btn-primary" style={{ flex: 1 }}><Ic.Check size={13}/> Save card</button>
          <button className="lgc-btn lgc-btn-outline">Save & new</button>
        </div>
      </div>
    </div>
  );
}

function ModularTabBar({ tabs, draggingIdx = -1 }) {
  // Pane chips — all panes are live at once; chips mirror the pane order below.
  // Dragging one shows a ghost slot and a drop arrow to indicate reordering.
  return (
    <div className="lgc-panebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, paddingRight: 4 }}>
        <Ic.Columns3 size={12}/>
        <span>Panes · drag to reorder</span>
      </div>
      {tabs.map((t, i) => {
        const isDragging = i === draggingIdx;
        return (
          <React.Fragment key={i}>
            <div className={`lgc-panechip ${isDragging ? 'lgc-panechip-ghost' : ''}`} style={isDragging ? { color: 'var(--fg-subtle)' } : {}}>
              <div className="lgc-panechip-idx">{i + 1}</div>
              <div className="lgc-panechip-dot" style={{ background: t.color }}/>
              <t.icon size={12}/>
              <span style={{ whiteSpace: 'nowrap' }}>{t.label}</span>
              <div className="lgc-panechip-live" title="Live"/>
              <Ic.GripVertical size={11} style={{ color: 'var(--fg-subtle)', marginLeft: 2 }}/>
            </div>
            {i < tabs.length - 1 && <span className="lgc-panearrow">⇄</span>}
          </React.Fragment>
        );
      })}
      <button className="lgc-btn lgc-btn-ghost" style={{ padding: '4px 8px', fontSize: 11, color: 'var(--fg-muted)' }}><Ic.Plus size={12}/> Add pane</button>
      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--fg-muted)' }}>
        <span>Layout</span>
        <div style={{ display: 'flex', gap: 2, alignItems: 'center', padding: 2, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 6 }}>
          <button className="lgc-icon-btn" style={{ width: 26, height: 24 }} title="1 pane"><Ic.PanelLeft size={13}/></button>
          <button className="lgc-icon-btn" style={{ width: 26, height: 24 }} title="2 panes"><Ic.Columns size={13}/></button>
          <button className="lgc-icon-btn" style={{ width: 26, height: 24, background: 'var(--bg-sunken)', color: 'var(--fg)' }} title="3 panes"><Ic.Columns3 size={13}/></button>
        </div>
      </div>
    </div>
  );
}

function ModularView({ theme = 'kanagawa', draggingIdx = -1 }) {
  const textureMap = { default: '', kanagawa: 'kanagawa-texture', sakura: 'sakura-texture', hanami: 'hanami-texture' };
  const tabs = [
    { icon: Ic.BookOpen, label: 'Reader — こゝろ', color: 'var(--accent)' },
    { icon: Ic.Search, label: 'Dictionary', color: 'var(--accent-2, var(--accent))' },
    { icon: Ic.Cards, label: 'Flashcards', color: 'var(--accent-3, var(--accent-2, var(--accent)))' },
  ];
  return (
    <div className={`theme-${theme} ${textureMap[theme] || ''}`} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ModularTabBar tabs={tabs} draggingIdx={draggingIdx}/>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Reader pane */}
        <div style={{ width: '48%', display: 'flex', position: 'relative', borderRight: '1px solid var(--border)' }}>
          <Reader theme={theme} inModular showContextMenu/>
        </div>
        <Divider label="48 / 27 / 25"/>
        <div style={{ width: '27%', display: 'flex', borderRight: '1px solid var(--border)' }}>
          <DictionaryPane compact/>
        </div>
        <Divider/>
        <div style={{ flex: 1, display: 'flex' }}>
          <FlashcardPane/>
        </div>
      </div>
    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ width: 4, background: 'var(--border)', position: 'relative', cursor: 'col-resize' }}>
      <div style={{ position: 'absolute', inset: 0, left: -2, right: -2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 3, height: 32, borderRadius: 2, background: 'var(--fg-subtle)', opacity: 0.45 }}/>
      </div>
      {label && <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', padding: '2px 6px', fontSize: 10, background: 'var(--fg)', color: 'var(--bg)', borderRadius: 4, fontFamily: 'Geist Mono, monospace', whiteSpace: 'nowrap' }}>{label}</div>}
    </div>
  );
}

Object.assign(window, { Shell, ModularView, DictionaryPane, FlashcardPane, ModularTabBar });
