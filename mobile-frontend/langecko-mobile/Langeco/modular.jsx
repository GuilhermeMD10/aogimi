// Modular multi-pane workspace — Reader + Dictionary + Decks together
// Collapsible left icon-rail navbar, pane bar at top, 1–3 live panes below.

const PANE_META = {
  reader:    { label: 'Reader',     dot: '#D97757', icon: 'BookOpen' },
  dict:      { label: 'Dictionary', dot: '#4B7AA3', icon: 'Search' },
  decks:     { label: 'Decks',      dot: '#8FB08A', icon: 'Cards' },
  study:     { label: 'Study',      dot: '#C78A4F', icon: 'Stars' },
  deckList:  { label: 'Deck',       dot: '#8FB08A', icon: 'Cards' },
};

function ModNav({ collapsed, active = 'reader' }) {
  const items = [
    { k: 'home', I: Ic.Home, l: 'Home' },
    { k: 'library', I: Ic.Library, l: 'Library' },
    { k: 'reader', I: Ic.BookOpen, l: 'Reader' },
    { k: 'dict', I: Ic.Search, l: 'Dictionary' },
    { k: 'decks', I: Ic.Cards, l: 'Decks' },
    { k: 'study', I: Ic.Stars, l: 'Study' },
  ];
  const width = collapsed ? 52 : 192;
  return (
    <div style={{
      width, flexShrink: 0, borderRight: '1px solid var(--border)',
      background: 'var(--bg-sunken)', display: 'flex', flexDirection: 'column',
      padding: '10px 8px', transition: 'width 180ms',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px 14px' }}>
        <div style={{ width: 30, height: 30, background: 'var(--accent)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>語</div>
        {!collapsed && <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 500 }}>Langeco</div>}
        {!collapsed && <button className="lgc-icon-btn" style={{ marginLeft: 'auto', width: 24, height: 24 }}><Ic.PanelLeft size={13}/></button>}
      </div>
      {items.map(it => {
        const isActive = it.k === active;
        return (
          <div key={it.k} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '7px' : '7px 10px', borderRadius: 6, margin: '1px 0',
            background: isActive ? 'var(--bg-elev)' : 'transparent',
            color: isActive ? 'var(--accent)' : 'var(--fg-muted)',
            border: isActive ? '1px solid var(--border)' : '1px solid transparent',
            cursor: 'pointer', justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <it.I size={15}/>
            {!collapsed && <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400 }}>{it.l}</span>}
          </div>
        );
      })}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {collapsed && <button className="lgc-icon-btn" style={{ width: 36, height: 32, margin: '0 auto' }} title="Expand"><Ic.PanelRight size={14}/></button>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '7px' : '7px 10px', borderRadius: 6, cursor: 'pointer', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{ width: 22, height: 22, borderRadius: 99, background: 'linear-gradient(135deg, var(--accent), var(--accent-2, var(--accent)))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white', fontFamily: 'var(--font-display)', flexShrink: 0 }}>波</div>
          {!collapsed && <span style={{ fontSize: 12, color: 'var(--fg)' }}>Lucas</span>}
        </div>
      </div>
    </div>
  );
}

function ModPaneBar({ panes, dragIdx = -1 }) {
  return (
    <div className="lgc-panebar" style={{ padding: '8px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginRight: 4 }}>Panes</div>
      {panes.map((p, i) => {
        const m = PANE_META[p];
        return (
          <React.Fragment key={i}>
            {i > 0 && <span className="lgc-panearrow">⇄</span>}
            <div className={`lgc-panechip ${dragIdx === i ? 'lgc-panechip-ghost' : ''}`}>
              <span className="lgc-panechip-idx">{i + 1}</span>
              <span className="lgc-panechip-dot" style={{ background: m.dot }}/>
              <span>{m.label}</span>
              <span className="lgc-panechip-live"/>
            </div>
          </React.Fragment>
        );
      })}
      <button className="lgc-btn lgc-btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }}>
        <Ic.Plus size={11}/> Add pane
      </button>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
        <button className="lgc-icon-btn" title="Layouts"><Ic.Columns3 size={13}/></button>
        <button className="lgc-icon-btn" title="Save workspace"><Ic.Star size={13}/></button>
      </div>
    </div>
  );
}

// ─────── Pane variants ───────

function ReaderPane({ flex = 1 }) {
  const { kokoroParagraphs } = window.BookData;
  return (
    <div style={{ flex, minWidth: 0, height: '100%', background: 'var(--bg-elev)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--fg-muted)' }}>
        <Ic.BookOpen size={12}/>
        <span style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)', fontWeight: 500 }}>こゝろ</span>
        <span>· 上・一 · p. 34</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
          <button className="lgc-icon-btn" style={{ width: 22, height: 22 }}><Ic.Type size={11}/></button>
          <button className="lgc-icon-btn" style={{ width: 22, height: 22 }}><Ic.Columns size={11}/></button>
        </div>
      </div>
      <div className="lgc-scroll" style={{ flex: 1, overflow: 'auto', padding: '24px 32px', fontFamily: 'var(--font-reader)' }}>
        {kokoroParagraphs.slice(0, 4).map((p, i) => (
          <p key={i} style={{ fontSize: 16, lineHeight: 2, color: 'var(--fg)', margin: '0 0 16px' }}>
            {i === 1
              ? <>これは世間を憚かる遠慮というよりも、その方が私にとって自然だからである。</>
              : i === 2
              ? <>私はその人の記憶を呼び起すごとに、すぐ「先生」といいたくなる。筆を執っても心持は同じ事である。</>
              : i === 0
              ? <>私はその人を常に先生と呼んでいた。だからここでもただ先生と書くだけで本名は打ち明けない。</>
              : <>私が先生と知り合いになったのは<mark style={{ background: 'var(--accent-soft)', padding: '0 2px', color: 'var(--fg)' }}>鎌倉</mark>である。その時私はまだ若々しい書生であった。</>
            }
          </p>
        ))}
      </div>
    </div>
  );
}

function DictPane({ flex = 1, state = 'detail' }) {
  return (
    <div style={{ flex, minWidth: 0, height: '100%', background: 'var(--bg-elev)', display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Ic.Search size={12}/>
        <div style={{ flex: 1, padding: '4px 8px', borderRadius: 5, background: 'var(--bg-sunken)', fontSize: 12, fontFamily: 'var(--font-display)' }}>
          {state === 'empty' ? <span style={{ color: 'var(--fg-subtle)' }}>Search dictionary…</span> : '鎌倉'}
        </div>
        <button className="lgc-icon-btn" style={{ width: 22, height: 22 }}><Ic.X size={11}/></button>
      </div>
      <div className="lgc-scroll" style={{ flex: 1, overflow: 'auto' }}>
        {state === 'empty' && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 12 }}>
            <Ic.Search size={28}/>
            <div style={{ marginTop: 10, fontWeight: 500, color: 'var(--fg)' }}>Tap a word in the reader</div>
            <div style={{ marginTop: 4 }}>Or type a search above.</div>
          </div>
        )}
        {state === 'results' && (
          <div>
            {[
              { jp: '鎌倉', rd: 'かまくら', en: 'Kamakura (city)', n: 'N2' },
              { jp: '鎌', rd: 'かま', en: 'sickle', n: 'N1' },
              { jp: '鎌倉時代', rd: 'かまくらじだい', en: 'Kamakura period', n: 'N1' },
              { jp: '鎌倉幕府', rd: 'かまくらばくふ', en: 'Kamakura shogunate', n: 'N1' },
            ].map((r, i) => (
              <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', gap: 12, background: i === 0 ? 'var(--bg-sunken)' : 'transparent' }}>
                <div style={{ minWidth: 70 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--fg)' }}>{r.jp}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--fg-muted)' }}>{r.rd}</div>
                </div>
                <div style={{ flex: 1, fontSize: 12, color: 'var(--fg)', paddingTop: 3 }}>{r.en}</div>
                <span className="lgc-chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 10, fontWeight: 600, alignSelf: 'flex-start' }}>{r.n}</span>
              </div>
            ))}
          </div>
        )}
        {state === 'detail' && (
          <div style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1 }}>鎌倉</div>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)', fontFamily: 'var(--font-display)' }}>かまくら</div>
              <button className="lgc-icon-btn" style={{ marginLeft: 'auto', width: 22, height: 22 }}><Ic.Volume size={12}/></button>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              <span className="lgc-chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 }}>N2</span>
              <span className="lgc-chip">place</span>
            </div>
            <div style={{ fontSize: 9, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>Meaning</div>
            <ol style={{ margin: 0, padding: '0 0 0 18px', fontSize: 12.5, lineHeight: 1.5 }}>
              <li style={{ marginBottom: 4 }}>Kamakura — coastal city in Kanagawa Prefecture.</li>
              <li>Kamakura period (1185–1333).</li>
            </ol>
            <div style={{ fontSize: 9, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginTop: 14, marginBottom: 4 }}>Kanji</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{c:'鎌',o:'ケン',k:'かま'},{c:'倉',o:'ソウ',k:'くら'}].map(k => (
                <div key={k.c} style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 5, flex: 1, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1 }}>{k.c}</div>
                  <div style={{ fontSize: 9, color: 'var(--fg-muted)', marginTop: 4 }}>音 {k.o}</div>
                  <div style={{ fontSize: 9, color: 'var(--fg-muted)' }}>訓 {k.k}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 9, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginTop: 14, marginBottom: 4 }}>From book</div>
            <div style={{ padding: 8, background: 'var(--bg-sunken)', borderRadius: 5, borderLeft: '2px solid var(--accent)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, lineHeight: 1.65 }}>
                …知り合いになったのは<mark style={{ background: 'var(--accent-soft)', padding: '0 2px', color: 'var(--fg)' }}>鎌倉</mark>である。
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 4 }}>
              <button className="lgc-btn lgc-btn-primary" style={{ flex: 1, fontSize: 11 }}><Ic.Plus size={11}/> Flashcard</button>
              <button className="lgc-btn lgc-btn-outline" style={{ fontSize: 11 }}>DeepL</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DecksPane({ flex = 1, state = 'list' }) {
  return (
    <div style={{ flex, minWidth: 0, height: '100%', background: 'var(--bg-elev)', display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
        <Ic.Cards size={12}/>
        {state === 'cards' ? (
          <>
            <span style={{ fontSize: 11, color: 'var(--fg-muted)', cursor: 'pointer' }}>Decks</span>
            <span style={{ color: 'var(--fg-subtle)' }}>/</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--fg)' }}>Kokoro — Ch. 1</span>
          </>
        ) : state === 'study' ? (
          <>
            <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Studying</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--fg)' }}>Kokoro — Ch. 1</span>
            <span style={{ fontSize: 10, fontFamily: 'Geist Mono, monospace', color: 'var(--fg-muted)', marginLeft: 4 }}>3/12</span>
          </>
        ) : (
          <span style={{ fontWeight: 600 }}>Your decks</span>
        )}
        <button className="lgc-icon-btn" style={{ marginLeft: 'auto', width: 22, height: 22 }}><Ic.MoreHorizontal size={11}/></button>
      </div>
      <div className="lgc-scroll" style={{ flex: 1, overflow: 'auto', padding: state === 'study' ? 0 : 12 }}>
        {state === 'list' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { n: 'Kokoro — Ch. 1', img: '#6B5A45', k: '心', c: 42, due: 12 },
              { n: 'N2 Grammar', img: '#2E5D4E', k: '文', c: 180, due: 28 },
              { n: 'Miyazawa K.', img: '#263B5C', k: '銀', c: 96, due: 6 },
              { n: 'Daily Kanji', img: '#8E3B36', k: '漢', c: 28, due: 0 },
            ].map((d, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', cursor: 'pointer', background: 'var(--bg-elev)' }}>
                <div style={{ height: 50, background: `linear-gradient(135deg, ${d.img} 0%, color-mix(in oklab, ${d.img} 50%, black) 100%)`, position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: 4, left: 8, fontFamily: 'var(--font-display)', fontSize: 20, color: 'rgba(255,255,255,0.9)', lineHeight: 1 }}>{d.k}</div>
                  {d.due > 0 && <div style={{ position: 'absolute', top: 4, right: 4, padding: '1px 6px', borderRadius: 99, background: 'var(--accent)', color: 'white', fontSize: 9, fontWeight: 600 }}>{d.due} due</div>}
                </div>
                <div style={{ padding: 8 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 500 }}>{d.n}</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'Geist Mono, monospace' }}>{d.c} cards</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {state === 'cards' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { jp: '鎌倉', rd: 'かまくら', st: 'new' },
              { jp: '先生', rd: 'せんせい', st: 'learning' },
              { jp: '記憶', rd: 'きおく', st: 'mastered' },
              { jp: '心持', rd: 'こころもち', st: 'new' },
              { jp: '憚かる', rd: 'はばかる', st: 'learning' },
              { jp: '書生', rd: 'しょせい', st: 'new' },
            ].map((c, i) => {
              const colors = { new: ['var(--accent-soft)', 'var(--accent)'], learning: ['rgba(242, 179, 61, 0.18)', '#B8802A'], mastered: ['rgba(129, 199, 132, 0.22)', '#3B7A40'] }[c.st];
              return (
                <div key={i} style={{ padding: '10px 8px', border: i === 0 ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 6, textAlign: 'center', background: 'var(--bg-elev)' }}>
                  <div style={{ padding: '1px 6px', display: 'inline-block', borderRadius: 99, background: colors[0], color: colors[1], fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{c.st}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--fg)', lineHeight: 1 }}>{c.jp}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--fg-muted)', marginTop: 3 }}>{c.rd}</div>
                </div>
              );
            })}
          </div>
        )}
        {state === 'study' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ height: 3, background: 'var(--bg-sunken)', borderRadius: 99, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, right: '75%', background: 'var(--accent)', borderRadius: 99 }}/>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
              <div className="lgc-card" style={{ padding: '22px 20px', width: '100%', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, lineHeight: 1, color: 'var(--fg)', marginBottom: 8 }}>鎌倉</div>
                <div style={{ fontSize: 10, color: 'var(--fg-subtle)', fontFamily: 'Geist Mono, monospace' }}>tap to reveal</div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 6, width: '100%' }}>
                <button className="lgc-btn lgc-btn-outline" style={{ flex: 1, fontSize: 11 }}><Ic.X size={11}/> Don't know</button>
                <button className="lgc-btn lgc-btn-primary" style={{ flex: 1, fontSize: 11 }}><Ic.Check size={11}/> I know it</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────── Workspace assembly ───────

function ModularWorkspace({ theme = 'default', navCollapsed = true, panes = ['reader', 'dict'], dictState = 'detail', decksState = 'list', dragIdx = -1, scenarioLabel }) {
  const textureMap = { default: '', kanagawa: 'kanagawa-texture', sakura: 'sakura-texture', hanami: 'hanami-texture' };
  return (
    <div className={`theme-${theme} ${textureMap[theme] || ''}`} style={{ width: '100%', height: '100%', display: 'flex', overflow: 'hidden' }}>
      <ModNav collapsed={navCollapsed} active={panes[0] === 'decks' && panes.length === 1 ? 'decks' : panes[0]}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ModPaneBar panes={panes} dragIdx={dragIdx}/>
        {scenarioLabel && (
          <div style={{ padding: '4px 14px', fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'Geist Mono, monospace', background: 'var(--bg-sunken)', borderBottom: '1px solid var(--border)' }}>
            {scenarioLabel}
          </div>
        )}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {panes.map((p, i) => {
            const flex = p === 'reader' ? 2 : 1;
            if (p === 'reader') return <ReaderPane key={i} flex={flex}/>;
            if (p === 'dict')   return <DictPane key={i} flex={flex} state={dictState}/>;
            if (p === 'decks')  return <DecksPane key={i} flex={flex} state={decksState}/>;
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ModularWorkspace });
