// Unified Reader — 3 themes (washi / linear / editorial), bottom expandable toolbar,
// optional vertical Japanese text mode, context menu.

function Reader({ theme = 'editorial', vertical = false, showContextMenu = false, toolbarExpanded = false, inModular = false }) {
  const { kokoroParagraphs } = window.BookData;
  const textureMap = { default: '', kanagawa: 'kanagawa-texture', sakura: 'sakura-texture', hanami: 'hanami-texture' };
  const themeClass = `theme-${theme} ${textureMap[theme] || ''}`;

  // Compose body with highlight markers on specific paragraphs
  const renderPara = (p, i) => {
    const content = i === 0 ? (
      <>私は<span className="word-hover hl-1">その人</span>を常に<span className="word-hover">先生</span>と呼んでいた。だからここでもただ先生と書くだけで本名は打ち明けない。</>
    ) : i === 2 ? (
      <>私はその人の<span className="word-hover hl-2">記憶</span>を呼び起すごとに、すぐ「先生」といいたくなる。筆を執っても<span className="word-hover hl-3">心持</span>は同じ事である。</>
    ) : i === 4 && showContextMenu ? (
      <>私が先生と知り合いになったのは<span style={{ background: 'var(--accent-soft)', outline: '1px solid var(--accent)', borderRadius: 2, padding: '0 2px' }}>鎌倉</span>である。その時私はまだ若々しい書生であった。</>
    ) : p.ja;
    return content;
  };

  return (
    <div className={themeClass} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--bg)' }}>
      {/* Minimal top meta bar */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        fontSize: 12, color: 'var(--fg-muted)',
        background: 'color-mix(in oklab, var(--bg) 85%, transparent)',
        backdropFilter: 'blur(10px)', zIndex: 5,
      }}>
        {!inModular && <button className="lgc-icon-btn"><Ic.ArrowLeft size={15}/></button>}
        <div style={{ marginLeft: inModular ? 0 : 12, display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
          <span style={{ color: 'var(--fg)', fontWeight: 500, fontFamily: 'var(--font-display)' }}>こゝろ</span>
          <span style={{ color: 'var(--fg-subtle)' }}>·</span>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>夏目 漱石</span>
          <span style={{ color: 'var(--fg-subtle)' }}>·</span>
          <span style={{ whiteSpace: 'nowrap' }}>上・一  鎌倉の海</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ fontFamily: 'Geist Mono, JetBrains Mono, monospace', fontSize: 11, color: 'var(--fg-muted)', fontVariantNumeric: 'tabular-nums' }}>34 / 412</div>
          <div style={{ width: 60, height: 3, background: 'var(--bg-sunken)', borderRadius: 99, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, right: '91.8%', background: 'var(--accent)', borderRadius: 99 }}/>
          </div>
        </div>
      </div>

      {/* Reading area */}
      <div className="lgc-scroll" style={{ flex: 1, overflow: 'auto', padding: vertical ? '40px 30px 140px' : (inModular ? '36px 32px 140px' : '60px 40px 180px') }}>
        {vertical ? (
          <div style={{ height: '100%', display: 'flex', justifyContent: 'flex-end' }}>
            <div className="vtxt" style={{
              fontFamily: 'var(--font-reader)',
              fontSize: 17, color: 'var(--fg)',
              height: '100%', maxWidth: '100%',
              columnWidth: '340px',
              columnGap: 40,
              columnRule: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--accent)', marginBottom: 24, fontFamily: 'var(--font-ui)' }}>上・一　鎌倉の海</div>
              {kokoroParagraphs.map((p, i) => (
                <p key={i} style={{ margin: '0 0 1em', textIndent: '1em' }}>{renderPara(p, i)}</p>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: inModular ? 560 : 640, margin: '0 auto' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 10, fontFamily: 'var(--font-ui)', fontWeight: 600 }}>Chapter 1 · §1</div>
            <h1 style={{
              fontFamily: 'var(--font-reader)', fontSize: inModular ? 26 : 32, fontWeight: 500, letterSpacing: '-0.015em',
              margin: '0 0 4px', color: 'var(--fg)',
            }}>鎌倉の海</h1>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 36, fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>
              The Sea at Kamakura
            </div>
            {kokoroParagraphs.map((p, i) => (
              <p key={i} style={{
                fontFamily: 'var(--font-reader)',
                fontSize: inModular ? 16 : 18, lineHeight: 1.85, margin: '0 0 1.3em',
                color: 'var(--fg)', textWrap: 'pretty',
              }}>{renderPara(p, i)}</p>
            ))}
          </div>
        )}
      </div>

      {/* Floating toolbar — bottom-center, expandable */}
      <BottomToolbar theme={theme} vertical={vertical} expanded={toolbarExpanded}/>

      {showContextMenu && <ContextMenuPopup inModular={inModular}/>}
    </div>
  );
}

function BottomToolbar({ theme, vertical, expanded }) {
  return (
    <>
      {/* Expanded panel sits above the bar */}
      {expanded && (
        <div style={{
          position: 'absolute', bottom: 72, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-elev)',
          border: '1px solid var(--border-strong)',
          borderRadius: 14,
          boxShadow: theme === 'hanami' ? '0 24px 48px -12px rgba(0,0,0,0.6)' : '0 20px 48px -16px rgba(0,0,0,0.18)',
          width: 380, padding: 16, zIndex: 29,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)' }}>Typography & Layout</div>
            <button className="lgc-icon-btn"><Ic.X size={13}/></button>
          </div>
          <Section label="Font">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
              {[
                { n: 'Serif', f: 'var(--font-reader)', active: true },
                { n: 'Sans', f: 'var(--font-ui)' },
                { n: 'Mono', f: 'Geist Mono, monospace' },
              ].map((x, i) => (
                <button key={x.n} style={{
                  padding: '10px 6px', fontSize: 13,
                  background: x.active ? 'var(--accent-soft)' : 'transparent',
                  border: '1px solid var(--border)',
                  color: x.active ? 'var(--accent)' : 'var(--fg)',
                  borderRadius: 6, cursor: 'pointer', fontFamily: x.f,
                }}>Aa 亜</button>
              ))}
            </div>
          </Section>

          <Section label="Size" value="18 px">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button className="lgc-icon-btn"><Ic.Minus size={13}/></button>
              <div style={{ flex: 1, height: 3, background: 'var(--bg-sunken)', borderRadius: 99, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, right: '55%', background: 'var(--accent)', borderRadius: 99 }}/>
                <div style={{ position: 'absolute', left: '45%', top: '50%', width: 12, height: 12, background: 'var(--bg-elev)', border: '2px solid var(--accent)', borderRadius: 99, transform: 'translate(-50%, -50%)' }}/>
              </div>
              <button className="lgc-icon-btn"><Ic.Plus size={13}/></button>
            </div>
          </Section>

          <Section label="Line height" value="1.85">
            <div style={{ display: 'flex', gap: 4 }}>
              {['1.4', '1.6', '1.85', '2.1', '2.4'].map((v, i) => (
                <button key={v} style={{
                  flex: 1, padding: '6px 0', fontSize: 11,
                  fontFamily: 'Geist Mono, monospace',
                  background: i === 2 ? 'var(--accent-soft)' : 'transparent',
                  color: i === 2 ? 'var(--accent)' : 'var(--fg-muted)',
                  border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
                }}>{v}</button>
              ))}
            </div>
          </Section>

          <Section label="Theme">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
              {[
                { name: 'Kanagawa', bg: '#EDE6D3', fg: '#0F2340', active: theme === 'kanagawa' },
                { name: 'Sakura', bg: '#FBF4F2', fg: '#3E2A2F', active: theme === 'sakura' },
                { name: 'Hanami', bg: '#14100C', fg: '#F5E9D4', active: theme === 'hanami' },
              ].map(t => (
                <button key={t.name} style={{
                  padding: '10px 6px', fontSize: 11,
                  background: t.bg, color: t.fg,
                  border: t.active ? '2px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 6, cursor: 'pointer',
                }}>{t.name}</button>
              ))}
            </div>
          </Section>

          <Section label="Page layout">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
              {[
                { icon: Ic.Scroll, n: 'Scroll', active: true },
                { icon: Ic.FileText, n: 'Single' },
                { icon: Ic.BookOpen, n: 'Spread' },
              ].map(x => (
                <button key={x.n} style={{
                  padding: '8px 6px', fontSize: 11,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  background: x.active ? 'var(--accent-soft)' : 'transparent',
                  color: x.active ? 'var(--accent)' : 'var(--fg)',
                  border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
                }}><x.icon size={14}/>{x.n}</button>
              ))}
            </div>
          </Section>

          <Section label="Japanese text direction">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              <button style={{
                padding: '8px 6px', fontSize: 11,
                background: !vertical ? 'var(--accent-soft)' : 'transparent',
                color: !vertical ? 'var(--accent)' : 'var(--fg)',
                border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M4 7h16M4 12h12M4 17h16"/></svg>
                Horizontal  横
              </button>
              <button style={{
                padding: '8px 6px', fontSize: 11,
                background: vertical ? 'var(--accent-soft)' : 'transparent',
                color: vertical ? 'var(--accent)' : 'var(--fg)',
                border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M17 4v16M12 4v12M7 4v16"/></svg>
                Vertical  縦 (RTL)
              </button>
            </div>
          </Section>
        </div>
      )}

      {/* The bar itself */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--bg-elev)',
        border: '1px solid var(--border-strong)',
        borderRadius: 12,
        boxShadow: theme === 'hanami'
          ? '0 24px 48px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03) inset'
          : '0 1px 2px rgba(0,0,0,0.04), 0 16px 36px -12px rgba(0,0,0,0.18)',
        padding: 4,
        display: 'flex', alignItems: 'center', gap: 2, zIndex: 30,
      }}>
        <button className="lgc-icon-btn" title="Previous page"><Ic.ChevronLeft size={15}/></button>
        <button className="lgc-icon-btn" title="Next page"><Ic.ChevronRight size={15}/></button>
        <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }}/>
        <button className="lgc-icon-btn" title="Table of contents"><Ic.List size={15}/></button>
        <button className="lgc-icon-btn" title="Bookmarks"><Ic.Bookmark size={15}/></button>
        <button className="lgc-icon-btn" title="Search"><Ic.Search size={15}/></button>
        <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }}/>
        <button className="lgc-icon-btn" title="Typography & Layout"
          style={{ background: expanded ? 'var(--accent-soft)' : 'transparent', color: expanded ? 'var(--accent)' : undefined }}>
          <Ic.Type size={15}/>
        </button>
        <button className="lgc-icon-btn" title="Theme">{theme === 'hanami' ? <Ic.Moon size={15}/> : <Ic.Sun size={15}/>}</button>
        <button className="lgc-icon-btn" title={vertical ? 'Vertical RTL' : 'Horizontal'} style={{ background: vertical ? 'var(--accent-soft)' : 'transparent', color: vertical ? 'var(--accent)' : undefined, fontSize: 13, fontFamily: 'var(--font-reader)', fontWeight: 500 }}>
          {vertical ? '縦' : '横'}
        </button>
        <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }}/>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', padding: '0 10px', fontFamily: 'Geist Mono, monospace', fontVariantNumeric: 'tabular-nums' }}>
          p. 34
        </div>
      </div>
    </>
  );
}

function Section({ label, value, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontWeight: 600 }}>
        <span>{label}</span>
        {value && <span style={{ color: 'var(--fg)', fontFamily: 'Geist Mono, monospace', textTransform: 'none' }}>{value}</span>}
      </div>
      {children}
    </div>
  );
}

function ContextMenuPopup({ inModular }) {
  return (
    <div style={{
      position: 'absolute', top: inModular ? 170 : 230, left: '50%', transform: 'translateX(-55%)',
      background: 'var(--bg-elev)', border: '1px solid var(--border-strong)',
      borderRadius: 10, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.25)',
      padding: 6, display: 'flex', alignItems: 'center', gap: 2,
      zIndex: 50, fontSize: 12.5,
    }}>
      <button className="lgc-btn" style={{ padding: '6px 10px' }}><Ic.Search size={13}/>Dictionary</button>
      <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }}/>
      <button className="lgc-btn" style={{ padding: '6px 10px' }}><Ic.Languages size={13}/>DeepL</button>
      <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }}/>
      <div style={{ display: 'flex', gap: 4, padding: '0 4px' }}>
        <button title="Highlight yellow" style={{ width: 18, height: 18, border: 'none', borderRadius: 3, background: 'rgb(255, 213, 79)', cursor: 'pointer' }}/>
        <button title="Highlight green" style={{ width: 18, height: 18, border: 'none', borderRadius: 3, background: 'rgb(129, 199, 132)', cursor: 'pointer' }}/>
        <button title="Highlight pink" style={{ width: 18, height: 18, border: 'none', borderRadius: 3, background: 'rgb(244, 143, 177)', cursor: 'pointer' }}/>
      </div>
      <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }}/>
      <button className="lgc-btn" style={{ padding: '6px 10px', color: 'var(--accent)' }}><Ic.Plus size={13}/>Flashcard</button>
    </div>
  );
}

Object.assign(window, { Reader, BottomToolbar, ContextMenuPopup });
