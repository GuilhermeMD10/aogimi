// Profile — editable own profile with kamon monogram avatar picker (demo)

// 16 kamon-style monograms. Rendered as SVG placeholders — circular frame + kanji glyph.
const kamonSet = [
  { k: '波', label: 'nami · wave' },
  { k: '桜', label: 'sakura · blossom' },
  { k: '月', label: 'tsuki · moon' },
  { k: '龍', label: 'ryū · dragon' },
  { k: '虎', label: 'tora · tiger' },
  { k: '鶴', label: 'tsuru · crane' },
  { k: '梅', label: 'ume · plum' },
  { k: '竹', label: 'take · bamboo' },
  { k: '松', label: 'matsu · pine' },
  { k: '山', label: 'yama · mountain' },
  { k: '川', label: 'kawa · river' },
  { k: '風', label: 'kaze · wind' },
  { k: '火', label: 'hi · fire' },
  { k: '星', label: 'hoshi · star' },
  { k: '雷', label: 'kaminari · thunder' },
  { k: '狐', label: 'kitsune · fox' },
];

function Kamon({ char, size = 48, active, bg, onClick }) {
  const bgColor = bg || 'var(--bg-sunken)';
  return (
    <div onClick={onClick} style={{
      width: size, height: size, borderRadius: '50%',
      background: bgColor,
      border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: onClick ? 'pointer' : 'default', flexShrink: 0, position: 'relative',
      boxShadow: active ? '0 0 0 3px color-mix(in oklab, var(--accent) 25%, transparent)' : 'none',
    }}>
      <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', border: '1px dashed color-mix(in oklab, currentColor 12%, transparent)' }}/>
      <div style={{ fontFamily: 'Shippori Mincho, serif', fontSize: size * 0.5, color: 'var(--fg)', lineHeight: 1 }}>
        {char}
      </div>
    </div>
  );
}

function ProfilePage({ theme = 'default', showAvatarPicker = false }) {
  const textureMap = { default: '', kanagawa: 'kanagawa-texture', sakura: 'sakura-texture', hanami: 'hanami-texture' };
  const { libraryBooks } = window.BookData;
  return (
    <div className={`theme-${theme} ${textureMap[theme] || ''}`} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Icon rail (reuse pattern) */}
        <div style={{ width: 52, borderRight: '1px solid var(--border)', background: 'var(--bg-sunken)', padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>語</div>
          {[Ic.Home, Ic.Library, Ic.BookOpen, Ic.Cards, Ic.Search, Ic.Stars].map((Icn, i) => (
            <button key={i} className="lgc-icon-btn" style={{ width: 34, height: 34 }}><Icn size={16}/></button>
          ))}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            <button className="lgc-icon-btn" style={{ width: 34, height: 34 }}><Ic.Settings size={16}/></button>
            <div style={{ width: 26, height: 26, borderRadius: 99, background: 'var(--accent)', border: '2px solid var(--bg-elev)' }}/>
          </div>
        </div>

        {/* Main */}
        <div className="lgc-scroll" style={{ flex: 1, overflow: 'auto' }}>
          {/* Hero */}
          <div style={{ position: 'relative', height: 160,
            background: theme === 'kanagawa'
              ? 'linear-gradient(135deg, #0F2340 0%, #1E3D6B 60%, #4B7AA3 100%)'
              : 'linear-gradient(135deg, #1A1918 0%, #3A342C 100%)',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.12,
              background: 'repeating-linear-gradient(45deg, transparent 0 12px, rgba(255,255,255,0.08) 12px 13px)' }}/>
            <button className="lgc-btn lgc-btn-ghost" style={{ position: 'absolute', top: 14, right: 18, color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.12)' }}>
              <Ic.Camera size={13}/> Edit cover
            </button>
          </div>

          <div style={{ padding: '0 40px', maxWidth: 1080, margin: '0 auto' }}>
            {/* Avatar + basic info */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginTop: -54, marginBottom: 20 }}>
              <div style={{ position: 'relative' }}>
                <Kamon char="波" size={108} bg="var(--bg-elev)"/>
                <button className="lgc-icon-btn" style={{ position: 'absolute', bottom: 4, right: 4, width: 30, height: 30, background: 'var(--accent)', color: 'white', borderRadius: '50%', border: '2px solid var(--bg)' }}>
                  <Ic.Pencil size={13}/>
                </button>
              </div>
              <div style={{ flex: 1, paddingBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 500, margin: 0, letterSpacing: '-0.015em' }}>Lucas</h1>
                  <button className="lgc-icon-btn" style={{ width: 24, height: 24 }}><Ic.Pencil size={12}/></button>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className="lgc-chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 }}>日本語 · N2</span>
                  <span className="lgc-chip" style={{ color: 'var(--fg-muted)' }}>Joined Apr 2026</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, paddingBottom: 6 }}>
                <button className="lgc-btn lgc-btn-ghost"><Ic.Share size={13}/> Share</button>
                <button className="lgc-btn lgc-btn-outline"><Ic.Settings size={13}/> Settings</button>
                <button className="lgc-btn lgc-btn-primary"><Ic.Pencil size={13}/> Edit profile</button>
              </div>
            </div>

            {/* Two-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, paddingBottom: 40 }}>
              <div>
                {/* Account form-ish */}
                <SectionCard title="Account">
                  <Field label="Display name" value="Lucas"/>
                  <Field label="Email" value="lucas@langeco.app"/>
                  <Field label="Language level">
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['N5', 'N4', 'N3', 'N2', 'N1'].map(l => (
                        <span key={l} className="lgc-chip" style={{
                          cursor: 'pointer',
                          background: l === 'N2' ? 'var(--accent)' : 'var(--bg-sunken)',
                          color: l === 'N2' ? 'white' : 'var(--fg-muted)',
                          fontWeight: l === 'N2' ? 600 : 400, padding: '4px 10px',
                        }}>{l}</span>
                      ))}
                    </div>
                  </Field>
                  <Field label="Theme">
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[
                        { n: 'Default', free: true, active: theme === 'default' },
                        { n: 'Kanagawa', active: theme === 'kanagawa' },
                        { n: 'Sakura' },
                        { n: 'Hanami' },
                      ].map(t => (
                        <div key={t.n} style={{
                          padding: '6px 12px', borderRadius: 6, fontSize: 12,
                          border: t.active ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: t.active ? 'var(--accent-soft)' : 'var(--bg-elev)',
                          color: t.active ? 'var(--accent)' : 'var(--fg)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          {t.n}
                          {!t.free && !t.active && <Ic.Lock size={10}/>}
                        </div>
                      ))}
                    </div>
                  </Field>
                </SectionCard>

                {/* Shared decks — simplified */}
                <SectionCard title="Shared decks" subtitle="3 public" actionLabel="Manage">
                  <div className="lgc-card" style={{ overflow: 'hidden', marginTop: 4 }}>
                    {[
                      { kamon: '心', n: 'Kokoro — Ch. 1', t: '42 cards · 12 subscribers', img: '#6B5A45' },
                      { kamon: '文', n: 'N2 Grammar Pack', t: '180 cards · 48 subscribers', img: '#2E5D4E' },
                      { kamon: '古', n: 'Taisho-era prose', t: '64 cards · 3 subscribers', img: '#7A5330' },
                    ].map((d, i, arr) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 6,
                          background: `linear-gradient(135deg, ${d.img} 0%, color-mix(in oklab, ${d.img} 50%, black) 100%)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-display)', fontSize: 18,
                        }}>{d.kamon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 500 }}>{d.n}</div>
                          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{d.t}</div>
                        </div>
                        <span className="lgc-chip" style={{ background: 'rgba(129, 199, 132, 0.22)', color: '#3B7A40', fontSize: 10, fontWeight: 600 }}>● Public</span>
                        <button className="lgc-icon-btn"><Ic.MoreHorizontal size={14}/></button>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>

              <div>
                {/* Currently reading */}
                <SectionCard title="Currently reading" subtitle="2 books">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                    {libraryBooks.filter(b => b.progress > 0 && b.progress < 100).slice(0, 2).map((b, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 8 }}>
                        <div style={{ width: 30, height: 42, background: b.cover, borderRadius: 2, flexShrink: 0 }}/>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 4 }}>{b.author}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, height: 3, background: 'var(--bg-sunken)', borderRadius: 99 }}>
                              <div style={{ width: `${b.progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }}/>
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'Geist Mono, monospace' }}>{b.progress}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Actions">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <ActionRow icon={Ic.Settings} label="Settings" sub="Preferences & notifications"/>
                    <ActionRow icon={Ic.LogOut} label="Sign out" danger/>
                  </div>
                </SectionCard>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAvatarPicker && <AvatarPickerModal/>}
    </div>
  );
}

function SectionCard({ title, subtitle, actionLabel, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {actionLabel && <a style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer' }}>{actionLabel}</a>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 16, padding: '10px 0', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--fg)' }}>
        {children || value}
      </div>
    </div>
  );
}

function ActionRow({ icon: Icn, label, sub, danger }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 6, cursor: 'pointer', background: 'var(--bg-elev)', border: '1px solid var(--border)', color: danger ? '#B33' : 'var(--fg)' }}>
      <Icn size={14}/>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{sub}</div>}
      </div>
      <Ic.ChevronRight size={13}/>
    </div>
  );
}

function AvatarPickerModal() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }}/>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 560, background: 'var(--bg-elev)', border: '1px solid var(--border-strong)',
        borderRadius: 12, boxShadow: '0 28px 56px -12px rgba(0,0,0,0.35)', zIndex: 41, overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>Choose avatar</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>Kamon — traditional family crest monograms</div>
          </div>
          <button className="lgc-icon-btn" style={{ marginLeft: 'auto' }}><Ic.X size={14}/></button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 14 }}>
            16 placeholder options · demo only. Social features will add custom uploads later.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10 }}>
            {kamonSet.map((k, i) => (
              <div key={k.k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <Kamon char={k.k} size={52} active={i === 0} onClick={() => {}}/>
                <div style={{ fontSize: 9, color: 'var(--fg-muted)', textAlign: 'center', lineHeight: 1.3, fontFamily: 'var(--font-display)' }}>
                  {k.k}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, padding: 12, background: 'var(--bg-sunken)', borderRadius: 8, fontSize: 12, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic.Lightbulb size={14}/>
            <span>Custom upload coming when social features ship.</span>
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="lgc-btn lgc-btn-ghost">Cancel</button>
          <button className="lgc-btn lgc-btn-primary"><Ic.Check size={13}/> Save</button>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ProfilePage, AvatarPickerModal, Kamon, kamonSet });
