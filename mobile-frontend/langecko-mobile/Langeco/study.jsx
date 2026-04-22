// Study session — flashcard review with context + summary screen

function StudyShell({ theme = 'default', children }) {
  const textureMap = { default: '', kanagawa: 'kanagawa-texture', sakura: 'sakura-texture', hanami: 'hanami-texture' };
  return (
    <div className={`theme-${theme} ${textureMap[theme] || ''}`} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  );
}

function StudyHeader({ idx = 7, total = 12, deckName = 'Kokoro — Ch. 1' }) {
  const pct = (idx / total) * 100;
  return (
    <div style={{ padding: '14px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, background: 'color-mix(in oklab, var(--bg) 85%, transparent)', backdropFilter: 'blur(10px)' }}>
      <button className="lgc-btn lgc-btn-ghost"><Ic.X size={14}/> End session</button>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'Geist Mono, monospace', fontVariantNumeric: 'tabular-nums', minWidth: 50 }}>
          {idx} / {total}
        </div>
        <div style={{ flex: 1, height: 4, background: 'var(--bg-sunken)', borderRadius: 99, position: 'relative', maxWidth: 600 }}>
          <div style={{ position: 'absolute', inset: 0, right: `${100 - pct}%`, background: 'var(--accent)', borderRadius: 99 }}/>
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'Geist Mono, monospace', minWidth: 48, textAlign: 'right' }}>
          {Math.round(pct)}%
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--fg-muted)' }}>
        <div style={{ fontFamily: 'var(--font-display)' }}>{deckName}</div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="lgc-icon-btn" title="Undo"><Ic.Undo size={14}/></button>
        <button className="lgc-icon-btn" title="Edit card"><Ic.Edit size={14}/></button>
      </div>
    </div>
  );
}

function StudyCard({ side = 'front', theme = 'default' }) {
  return (
    <div className="lgc-card" style={{
      width: 620, minHeight: 380,
      padding: '36px 32px', display: 'flex', flexDirection: 'column',
      position: 'relative', boxShadow: '0 20px 50px -20px rgba(0,0,0,0.2)',
    }}>
      <div style={{ position: 'absolute', top: 14, left: 16, display: 'flex', gap: 4 }}>
        <span className="lgc-chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 }}>N2</span>
        <span className="lgc-chip">noun</span>
      </div>
      <div style={{ position: 'absolute', top: 14, right: 16, fontSize: 10, color: 'var(--fg-subtle)', fontFamily: 'Geist Mono, monospace' }}>
        {side === 'front' ? 'FRONT' : 'BACK'}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        {side === 'front' ? (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 96, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--fg)', marginBottom: 16 }}>
              鎌倉
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-subtle)', fontFamily: 'Geist Mono, monospace', marginBottom: 32 }}>
              Tap to reveal · Space
            </div>
            <button className="lgc-btn lgc-btn-ghost" style={{ padding: '6px 14px' }}>
              <Ic.Volume size={14}/> Play audio
            </button>
          </>
        ) : (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 54, lineHeight: 1, color: 'var(--fg)', marginBottom: 4 }}>
              鎌倉
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--fg-muted)', marginBottom: 18 }}>
              かまくら
            </div>
            <div style={{ fontSize: 18, color: 'var(--fg)', lineHeight: 1.5, maxWidth: 460, marginBottom: 10 }}>
              Kamakura — coastal city in Kanagawa Prefecture, south of Tokyo.
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', fontStyle: 'italic' }}>
              Capital during the Kamakura period (1185–1333).
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ContextBox() {
  return (
    <div style={{
      width: 620, marginTop: 18, padding: '12px 16px',
      background: 'var(--bg-sunken)', borderRadius: 8, borderLeft: '3px solid var(--accent)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--fg-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
        <Ic.BookOpen size={11}/>
        Context · こゝろ · p. 34
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, lineHeight: 1.7, color: 'var(--fg)' }}>
        私が先生と知り合いになったのは<mark style={{ background: 'var(--accent-soft)', padding: '0 2px', color: 'var(--fg)' }}>鎌倉</mark>である。
      </div>
      <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4, fontStyle: 'italic' }}>
        I met Sensei in Kamakura.
      </div>
    </div>
  );
}

function ContextToggle({ on = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--fg-muted)', padding: '6px 10px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 99 }}>
      <Ic.BookOpen size={11}/>
      <span>Show context sentence</span>
      <div style={{ width: 26, height: 14, borderRadius: 99, background: on ? 'var(--accent)' : 'var(--border-strong)', position: 'relative', cursor: 'pointer' }}>
        <div style={{ position: 'absolute', top: 1, left: on ? 13 : 1, width: 12, height: 12, borderRadius: '50%', background: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 0.15s' }}/>
      </div>
    </div>
  );
}

function StudyActionButtons() {
  return (
    <div style={{ marginTop: 28, display: 'flex', gap: 12, width: 620 }}>
      <button style={{
        flex: 1, padding: '16px 20px',
        background: 'var(--bg-elev)', border: '1.5px solid var(--border-strong)', borderRadius: 10,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        fontFamily: 'inherit', color: 'var(--fg)', fontSize: 15, fontWeight: 600,
      }}>
        <Ic.X size={16}/> Don't know it
        <kbd style={{ fontSize: 10, fontFamily: 'Geist Mono, monospace', padding: '2px 6px', border: '1px solid var(--border-strong)', borderRadius: 3, color: 'var(--fg-muted)', fontWeight: 400 }}>1</kbd>
      </button>
      <button style={{
        flex: 1, padding: '16px 20px',
        background: 'var(--accent)', border: '1.5px solid var(--accent)', borderRadius: 10,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        fontFamily: 'inherit', color: 'white', fontSize: 15, fontWeight: 600,
      }}>
        <Ic.Check size={16}/> I know it
        <kbd style={{ fontSize: 10, fontFamily: 'Geist Mono, monospace', padding: '2px 6px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 3, color: 'rgba(255,255,255,0.85)', fontWeight: 400 }}>2</kbd>
      </button>
    </div>
  );
}

function StudyFront({ theme = 'default', showContext = true }) {
  return (
    <StudyShell theme={theme}>
      <StudyHeader idx={7} total={12}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ width: 620, display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <ContextToggle on={showContext}/>
        </div>
        <StudyCard side="front" theme={theme}/>
        {showContext && <ContextBox/>}
        <StudyActionButtons/>
      </div>
    </StudyShell>
  );
}

function StudyBack({ theme = 'default', showContext = true }) {
  return (
    <StudyShell theme={theme}>
      <StudyHeader idx={7} total={12}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ width: 620, display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <ContextToggle on={showContext}/>
        </div>
        <StudyCard side="back" theme={theme}/>
        {showContext && <ContextBox/>}
        <StudyActionButtons/>
      </div>
    </StudyShell>
  );
}

function StudySummary({ theme = 'default' }) {
  return (
    <StudyShell theme={theme}>
      <div style={{ padding: '14px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button className="lgc-btn lgc-btn-ghost"><Ic.ArrowLeft size={14}/> Back to deck</button>
        <div style={{ flex: 1, fontSize: 12, color: 'var(--fg-muted)', textAlign: 'center', fontFamily: 'var(--font-display)' }}>
          Kokoro — Ch. 1
        </div>
        <button className="lgc-btn lgc-btn-ghost"><Ic.Share size={13}/> Share</button>
      </div>
      <div className="lgc-scroll" style={{ flex: 1, overflow: 'auto', padding: '40px 20px' }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Session complete</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, lineHeight: 1, color: 'var(--fg)', marginBottom: 8, letterSpacing: '-0.02em' }}>
              お疲れさま
            </div>
            <div style={{ fontSize: 15, color: 'var(--fg-muted)' }}>12 cards reviewed in 4 min 18 s</div>
          </div>

          {/* Stats */}
          <div className="lgc-card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
              <SummaryStat label="Knew it" value="9" sub="75%" color="#3B7A40"/>
              <SummaryStat label="Didn't know" value="3" sub="25%" color="#B8802A"/>
              <SummaryStat label="Avg time" value="21s" sub="per card" />
            </div>

            {/* Breakdown bar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>Result breakdown</div>
              <div style={{ height: 10, display: 'flex', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: '75%', background: '#3B7A40' }}/>
                <div style={{ width: '25%', background: '#B8802A' }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--fg-muted)' }}>
                <span>● 9 known</span>
                <span>● 3 to review</span>
              </div>
            </div>
          </div>

          {/* Cards to review */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 10 }}>Cards to review again</div>
            <div className="lgc-card" style={{ overflow: 'hidden' }}>
              {[
                { jp: '憚かる', rd: 'はばかる', en: 'to hesitate, defer to' },
                { jp: '心持', rd: 'こころもち', en: 'feeling, sentiment' },
                { jp: '打ち明ける', rd: 'うちあける', en: 'to confide, reveal' },
              ].map((c, i, arr) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--fg)', minWidth: 70 }}>{c.jp}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--fg-muted)', minWidth: 90 }}>{c.rd}</div>
                  <div style={{ flex: 1, fontSize: 12.5, color: 'var(--fg)' }}>{c.en}</div>
                  <span className="lgc-chip" style={{ background: 'rgba(242, 179, 61, 0.18)', color: '#B8802A', fontSize: 10, fontWeight: 600 }}>Review</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="lgc-btn lgc-btn-outline" style={{ flex: 1, padding: '12px' }}><Ic.RotateCw size={14}/> Review 3 cards again</button>
            <button className="lgc-btn lgc-btn-primary" style={{ flex: 1, padding: '12px' }}><Ic.Check size={14}/> Done</button>
          </div>
        </div>
      </div>
    </StudyShell>
  );
}

function SummaryStat({ label, value, sub, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 36, fontFamily: 'Geist Mono, monospace', fontWeight: 500, color: color || 'var(--fg)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

Object.assign(window, { StudyFront, StudyBack, StudySummary });
