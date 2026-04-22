// Full profile as a large floating bubble. Bigger than a popover but
// still not a fullscreen page — feels like a focused workspace panel
// above the rest. Tap outside (on soft scrim) to dismiss.

const USER_FULL = {
  name: 'Pedro Carvalho',
  handle: '@pedro',
  email: 'pedro@ceiia.com',
  level: 'N2',
  joined: 'Apr 2026',
  streak: 14,
  words: 847,
  studied: 2340,
  kamon: '波',
};

function FullProfileBubble({ width = 880, height = 620 }) {
  const { libraryBooks } = window.BookData;
  const currentBooks = libraryBooks.filter(b => b.progress > 0 && b.progress < 100).slice(0, 2);
  const decks = [
    { kamon: '心', n: 'Kokoro — Ch. 1', t: '42 cards · 12 subscribers', img: '#6B5A45', public: true },
    { kamon: '文', n: 'N2 Grammar Pack', t: '180 cards · 48 subscribers', img: '#2E5D4E', public: true },
    { kamon: '古', n: 'Taisho-era prose', t: '64 cards · 3 subscribers', img: '#7A5330', public: true },
  ];

  return (
    <div className="theme-default" style={{
      position: 'absolute', bottom: 82, left: '50%', transform: 'translateX(-50%)',
      zIndex: 40, width, height,
      background: 'var(--bg-elev)',
      border: '1px solid var(--border)',
      borderRadius: 20,
      boxShadow: '0 32px 80px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      fontFamily: 'var(--font-ui)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Cover band */}
      <div style={{
        position: 'relative', height: 108, flexShrink: 0,
        background: 'linear-gradient(135deg, #1A1918 0%, #3A342C 60%, #6B5A45 100%)',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.12, background: 'repeating-linear-gradient(45deg, transparent 0 10px, rgba(255,255,255,0.08) 10px 11px)' }}/>
        {/* top-right bar: close & meta */}
        <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="lgc-btn lgc-btn-ghost" style={{ color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.12)', fontSize: 11, padding: '5px 9px' }}>
            <Ic.Camera size={11}/> Cover
          </button>
          <button title="Close" style={{
            width: 28, height: 28, borderRadius: 99, border: '1px solid rgba(255,255,255,0.22)',
            background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Ic.X size={12}/></button>
        </div>
        {/* top-left: breadcrumb */}
        <div style={{ position: 'absolute', top: 14, left: 18, color: 'rgba(255,255,255,0.65)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace' }}>
          Profile
        </div>
      </div>

      {/* Avatar row (overlaps cover) */}
      <div style={{ padding: '0 24px', display: 'flex', alignItems: 'flex-end', gap: 18, marginTop: -44, flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <Kamon char={USER_FULL.kamon} size={88} bg="var(--bg-elev)"/>
          <button className="lgc-icon-btn" style={{ position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, background: 'var(--accent)', color: 'white', borderRadius: '50%', border: '2px solid var(--bg-elev)' }}>
            <Ic.Pencil size={11}/>
          </button>
        </div>
        <div style={{ flex: 1, paddingBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, margin: 0, letterSpacing: '-0.015em', color: 'var(--fg)' }}>{USER_FULL.name}</h1>
            <button className="lgc-icon-btn" style={{ width: 20, height: 20 }}><Ic.Pencil size={10}/></button>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 3, fontFamily: 'ui-monospace, monospace' }}>{USER_FULL.handle} · joined {USER_FULL.joined}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
            <span className="lgc-chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600, fontSize: 10.5, padding: '3px 8px' }}>日本語 · {USER_FULL.level}</span>
            <span className="lgc-chip" style={{ color: 'var(--fg-muted)', fontSize: 10.5, padding: '3px 8px' }}>🔥 {USER_FULL.streak}d streak</span>
            <span className="lgc-chip" style={{ color: 'var(--fg-muted)', fontSize: 10.5, padding: '3px 8px' }}>{USER_FULL.words} words</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, paddingBottom: 4 }}>
          <button className="lgc-btn lgc-btn-outline" style={{ fontSize: 11.5, padding: '6px 10px' }}><Ic.Share size={11}/> Share</button>
          <button className="lgc-btn lgc-btn-primary" style={{ fontSize: 11.5, padding: '6px 10px' }}><Ic.Pencil size={11}/> Edit</button>
        </div>
      </div>

      {/* Body — 2 columns, scrollable */}
      <div className="lgc-scroll" style={{ flex: 1, overflow: 'auto', padding: '18px 24px 22px', marginTop: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 20 }}>
          {/* LEFT — account + decks */}
          <div>
            <BubbleSection title="Account">
              <BubbleField label="Display name" value={USER_FULL.name}/>
              <BubbleField label="Email" value={USER_FULL.email}/>
              <BubbleField label="Language level">
                <div style={{ display: 'flex', gap: 4 }}>
                  {['N5', 'N4', 'N3', 'N2', 'N1'].map(l => (
                    <span key={l} className="lgc-chip" style={{
                      cursor: 'pointer', fontSize: 10.5, padding: '3px 8px',
                      background: l === USER_FULL.level ? 'var(--accent)' : 'var(--bg-sunken)',
                      color: l === USER_FULL.level ? 'white' : 'var(--fg-muted)',
                      fontWeight: l === USER_FULL.level ? 600 : 400,
                    }}>{l}</span>
                  ))}
                </div>
              </BubbleField>
              <BubbleField label="Theme">
                <div style={{ display: 'flex', gap: 5 }}>
                  {[
                    { n: 'Default', active: true, free: true },
                    { n: 'Kanagawa' },
                    { n: 'Sakura' },
                    { n: 'Hanami' },
                  ].map(t => (
                    <div key={t.n} style={{
                      padding: '4px 10px', borderRadius: 5, fontSize: 10.5,
                      border: t.active ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                      background: t.active ? 'var(--accent-soft)' : 'var(--bg-elev)',
                      color: t.active ? 'var(--accent)' : 'var(--fg)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      {t.n}
                      {!t.free && !t.active && <Ic.Lock size={9}/>}
                    </div>
                  ))}
                </div>
              </BubbleField>
            </BubbleSection>

            <BubbleSection title="Shared decks" subtitle="3 public" actionLabel="Manage">
              <div className="lgc-card" style={{ overflow: 'hidden', marginTop: 4 }}>
                {decks.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: i < decks.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 5,
                      background: `linear-gradient(135deg, ${d.img} 0%, color-mix(in oklab, ${d.img} 50%, black) 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-display)', fontSize: 15,
                    }}>{d.kamon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 500 }}>{d.n}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--fg-muted)' }}>{d.t}</div>
                    </div>
                    <span className="lgc-chip" style={{ background: 'rgba(129, 199, 132, 0.22)', color: '#3B7A40', fontSize: 9.5, fontWeight: 600, padding: '2px 6px' }}>● Public</span>
                    <button className="lgc-icon-btn"><Ic.MoreHorizontal size={12}/></button>
                  </div>
                ))}
              </div>
            </BubbleSection>
          </div>

          {/* RIGHT — stats, reading, actions */}
          <div>
            <BubbleSection title="At a glance">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, background: 'var(--border)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {[
                  { label: 'Streak', value: USER_FULL.streak, suffix: 'd' },
                  { label: 'Words', value: USER_FULL.words },
                  { label: 'Studied', value: USER_FULL.studied },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-elev)', padding: '10px 6px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--fg)' }}>{s.value}{s.suffix && <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 2 }}>{s.suffix}</span>}</div>
                    <div style={{ fontSize: 9, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </BubbleSection>

            <BubbleSection title="Currently reading" subtitle={`${currentBooks.length} books`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {currentBooks.map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 7 }}>
                    <div style={{ width: 26, height: 36, background: b.cover, borderRadius: 2, flexShrink: 0 }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', marginBottom: 3 }}>{b.author}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 2.5, background: 'var(--bg-sunken)', borderRadius: 99 }}>
                          <div style={{ width: `${b.progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }}/>
                        </div>
                        <span style={{ fontSize: 9.5, color: 'var(--fg-muted)', fontFamily: 'ui-monospace, monospace' }}>{b.progress}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </BubbleSection>

            <BubbleSection title="Actions">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <BubbleActionRow icon={Ic.Bookmark} label="Saved highlights" sub="24 saved"/>
                <BubbleActionRow icon={Ic.Settings} label="Preferences" sub="Notifications & sync"/>
                <BubbleActionRow icon={Ic.LogOut} label="Sign out" danger/>
              </div>
            </BubbleSection>
          </div>
        </div>
      </div>
    </div>
  );
}

function BubbleSection({ title, subtitle, actionLabel, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 9.5, color: 'var(--accent)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 1 }}>{subtitle}</div>}
        </div>
        {actionLabel && <a style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer' }}>{actionLabel}</a>}
      </div>
      {children}
    </div>
  );
}

function BubbleField({ label, value, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, padding: '8px 0', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
      <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 11.5, color: 'var(--fg)' }}>{children || value}</div>
    </div>
  );
}

function BubbleActionRow({ icon: Icn, label, sub, danger }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', background: 'var(--bg-elev)', border: '1px solid var(--border)', color: danger ? '#B33' : 'var(--fg)' }}>
      <Icn size={12}/>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11.5, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{sub}</div>}
      </div>
      <Ic.ChevronRight size={11}/>
    </div>
  );
}

Object.assign(window, { FullProfileBubble });
