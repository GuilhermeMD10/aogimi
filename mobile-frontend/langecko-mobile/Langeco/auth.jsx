// Auth — split layout: form on left, cultural brand art on right
// Login + Signup variants.

function BrandPanel({ theme = 'default', mode = 'login' }) {
  // Right-side brand art: layered waves/kamon using CSS only. Theme-aware.
  const crestChar = { default: '語', kanagawa: '波', sakura: '桜', hanami: '祭' }[theme] || '語';
  const tagline = {
    default: 'read · learn · remember',
    kanagawa: '波の向こうに、言葉がある',
    sakura: '桜の下で、言葉を集める',
    hanami: '灯りの下、夜の読書',
  }[theme];
  const brandBg = theme === 'default'
    ? 'linear-gradient(160deg, #1A1918 0%, #2A2724 60%, #3A342C 100%)'
    : theme === 'kanagawa'
    ? 'linear-gradient(160deg, #0F2340 0%, #1E3D6B 55%, #4B7AA3 100%)'
    : 'linear-gradient(160deg, #1A1918 0%, #2A2724 100%)';

  return (
    <div style={{
      flex: 1, minWidth: 420,
      background: brandBg,
      color: 'rgba(255,255,255,0.9)', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: 40,
    }}>
      {/* Decorative: concentric "seigaiha-like" arcs using radial gradients */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.12,
        background: `
          radial-gradient(circle at 80% 90%, rgba(255,255,255,0.7) 0%, transparent 18%),
          radial-gradient(circle at 80% 90%, rgba(255,255,255,0.5) 0 22%, transparent 23%),
          radial-gradient(circle at 80% 90%, rgba(255,255,255,0.3) 0 34%, transparent 35%),
          radial-gradient(circle at 80% 90%, rgba(255,255,255,0.2) 0 46%, transparent 47%)
        `,
      }}/>
      {/* Subtle stripe texture */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(91deg, transparent 0 2px, rgba(255,255,255,0.02) 2px 3px)' }}/>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Shippori Mincho, serif', fontSize: 20 }}>
            {crestChar}
          </div>
          <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, fontWeight: 400, letterSpacing: '-0.01em' }}>
            Langeco
          </div>
        </div>
      </div>

      {/* Center kamon */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{
          width: 180, height: 180, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
          marginBottom: 24, position: 'relative',
        }}>
          <div style={{ fontFamily: 'Shippori Mincho, serif', fontSize: 110, lineHeight: 1, color: 'rgba(255,255,255,0.92)' }}>
            {crestChar}
          </div>
          {/* Inner ring */}
          <div style={{ position: 'absolute', inset: 14, borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.12)' }}/>
        </div>
        <div style={{ fontFamily: 'Shippori Mincho, serif', fontSize: 22, letterSpacing: '0.06em', opacity: 0.95, marginBottom: 6 }}>
          {tagline}
        </div>
        <div style={{ fontSize: 13, opacity: 0.55, maxWidth: 340, lineHeight: 1.6 }}>
          Read real Japanese literature with the dictionary, flashcards, and context built right in.
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.55, fontFamily: 'Geist Mono, monospace' }}>
        <span>© 2026 Langeco</span>
        <span>{mode === 'login' ? 'welcome back' : 'joining the library'}</span>
      </div>
    </div>
  );
}

function AuthField({ label, type = 'text', placeholder, icon, value, trailing }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: 'var(--fg-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px', border: '1px solid var(--border-strong)', borderRadius: 8,
        background: 'var(--bg-elev)',
      }}>
        {icon}
        <input type={type} placeholder={placeholder} defaultValue={value}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--fg)', fontFamily: 'inherit' }}/>
        {trailing}
      </div>
    </label>
  );
}

function LoginPage({ theme = 'default' }) {
  const textureMap = { default: '', kanagawa: 'kanagawa-texture', sakura: 'sakura-texture', hanami: 'hanami-texture' };
  return (
    <div className={`theme-${theme} ${textureMap[theme] || ''}`} style={{ width: '100%', height: '100%', display: 'flex' }}>
      {/* Left: form */}
      <div style={{ width: 440, padding: '50px 44px', display: 'flex', flexDirection: 'column', overflow: 'auto' }} className="lgc-scroll">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'auto', paddingBottom: 40 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600 }}>語</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500 }}>Langeco</span>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Sign in</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 500, margin: 0, letterSpacing: '-0.015em', marginBottom: 6 }}>Welcome back</h1>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Continue where you left off reading.</div>
        </div>

        <AuthField label="Email" type="email" placeholder="you@email.com" icon={<Ic.Mail size={14}/>} value="lucas@langeco.app"/>
        <AuthField label="Password" type="password" placeholder="••••••••" icon={<Ic.Lock size={14}/>}
          value="secret-password"
          trailing={<button className="lgc-icon-btn" style={{ width: 22, height: 22 }}><Ic.Eye size={14}/></button>}/>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-muted)', cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked style={{ margin: 0, accentColor: 'var(--accent)' }}/>
            Keep me signed in
          </label>
          <a style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer' }}>Forgot password?</a>
        </div>

        <button className="lgc-btn lgc-btn-primary" style={{ padding: '12px 16px', fontSize: 14, marginBottom: 14, justifyContent: 'center' }}>
          Sign in <Ic.ArrowRight size={14}/>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--fg-muted)', marginBottom: 14 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
          <span>or continue with</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 28 }}>
          <button className="lgc-btn lgc-btn-outline" style={{ padding: '10px', justifyContent: 'center', fontSize: 13 }}>
            <Ic.Globe size={14}/> Google
          </button>
          <button className="lgc-btn lgc-btn-outline" style={{ padding: '10px', justifyContent: 'center', fontSize: 13 }}>
             Apple
          </button>
        </div>

        <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: 13, color: 'var(--fg-muted)' }}>
          New here? <a style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}>Create an account</a>
        </div>
      </div>
      <BrandPanel theme={theme} mode="login"/>
    </div>
  );
}

function SignupPage({ theme = 'default' }) {
  const textureMap = { default: '', kanagawa: 'kanagawa-texture', sakura: 'sakura-texture', hanami: 'hanami-texture' };
  return (
    <div className={`theme-${theme} ${textureMap[theme] || ''}`} style={{ width: '100%', height: '100%', display: 'flex' }}>
      <div style={{ width: 440, padding: '44px 44px', display: 'flex', flexDirection: 'column', overflow: 'auto' }} className="lgc-scroll">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600 }}>語</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500 }}>Langeco</span>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Create account</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 500, margin: 0, letterSpacing: '-0.015em', marginBottom: 6 }}>Join Langeco</h1>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Start reading Japanese literature in minutes.</div>
        </div>

        <AuthField label="Display name" placeholder="e.g. Lucas" icon={<Ic.User size={14}/>} value="Lucas"/>
        <AuthField label="Email" type="email" placeholder="you@email.com" icon={<Ic.Mail size={14}/>} value="lucas@langeco.app"/>
        <AuthField label="Password" type="password" placeholder="Pick something memorable" icon={<Ic.Lock size={14}/>}
          value="new-secret-pw"
          trailing={<button className="lgc-icon-btn" style={{ width: 22, height: 22 }}><Ic.Eye size={14}/></button>}/>

        {/* Password strength */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, marginTop: -8 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i < 3 ? 'var(--accent)' : 'var(--bg-sunken)' }}/>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 16, marginTop: -4 }}>Strong password · 14 characters</div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Learning</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { f: '🇯🇵', l: 'Japanese', active: true },
              { f: '🇬🇧', l: 'English' },
              { f: '＋', l: 'Other', muted: true },
            ].map(x => (
              <div key={x.l} style={{
                flex: 1, padding: '10px 6px', borderRadius: 8, textAlign: 'center',
                border: x.active ? '2px solid var(--accent)' : '1px solid var(--border-strong)',
                background: x.active ? 'var(--accent-soft)' : 'var(--bg-elev)',
                color: x.active ? 'var(--accent)' : 'var(--fg)',
                cursor: 'pointer', fontSize: 12, fontWeight: x.active ? 600 : 400,
              }}>
                <div style={{ fontSize: 16, marginBottom: 2, filter: 'grayscale(0)' }}>{x.f}</div>
                {x.l}
              </div>
            ))}
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--fg-muted)', marginBottom: 16, lineHeight: 1.5, cursor: 'pointer' }}>
          <input type="checkbox" defaultChecked style={{ marginTop: 3, accentColor: 'var(--accent)' }}/>
          <span>I agree to the <a style={{ color: 'var(--accent)' }}>terms of service</a> and <a style={{ color: 'var(--accent)' }}>privacy policy</a>.</span>
        </label>

        <button className="lgc-btn lgc-btn-primary" style={{ padding: '12px 16px', fontSize: 14, marginBottom: 18, justifyContent: 'center' }}>
          Create account <Ic.ArrowRight size={14}/>
        </button>

        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--fg-muted)' }}>
          Already have an account? <a style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}>Sign in</a>
        </div>
      </div>
      <BrandPanel theme={theme} mode="signup"/>
    </div>
  );
}

Object.assign(window, { LoginPage, SignupPage });
