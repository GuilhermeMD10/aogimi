/**
 * The /sky stage's glass-chrome palette — the handover's T_NIGHT values.
 *
 * **Deliberately not in `ds-tokens.css`.** The sky stage is night in BOTH
 * themes (the `--deck-sky` / dock convention: a surface that never varies by
 * theme doesn't get theme tokens), so every piece of chrome floating on it is
 * light-on-dark always. Promoting these would widen the palette every screen
 * reads with values only this stage uses — the same reasoning as the dock's
 * `--dock-glass-*` block in `styles/glass.css`, kept local instead rather than
 * shared because unlike the dock these are one feature's constants, not app
 * chrome. Rank colours are NOT here: dots, bars and pills read `stageColor()`
 * (the `--stage-*` ramp the sky's palette mirrors), so the list chrome and the
 * stars always agree.
 *
 * The two exceptions are `active` / `activeInk`, which reference tokens rather
 * than stating a value: "this one is selected" is answered app-wide by
 * `--active`, and the stage disagreeing with the dock about what selected looks
 * like is exactly the drift the token exists to prevent.
 */
export const NIGHT = {
  /* The stage's own `bg` is gone: the sky is the page now. `--page-base` in
     `styles/ds-tokens.css` is the app-wide night and SkyCanvas paints nothing,
     so nothing here needs a fill behind the map. */
  ink: '#f2f1ee',
  soft: '#c9c8c4',
  muted: '#9b9aa2',
  faint: '#75747e',
  glass: 'rgba(18,23,38,.66)',
  panel: 'rgba(18,23,38,.86)',
  tintA: 'rgba(255,255,255,.13)',
  tintB: 'rgba(255,255,255,.055)',
  bdA: 'rgba(255,255,255,.22)',
  bdB: 'rgba(255,255,255,.12)',
  /** Selected chrome. The app's active tint at glass density, and the dark ink
      it carries — these are `var()`s so the stage follows the token. */
  active: 'var(--glass-active-fill)',
  activeBd: 'var(--glass-active-bd)',
  activeInk: 'var(--active-ink)',
  /** Primary button: gold fill, near-black ink. */
  btn: '#ffe085',
  btnInk: '#141414',
  /** The logo tile's vermilion — the brand accent, pinned like the rest. */
  accent: '#c2452c',
  gold: '#ffe085',
  danger: '#e0715a',
  dangerBg: 'rgba(224,113,90,.14)',
  dangerBd: 'rgba(224,113,90,.34)',
  track: '#20263a',
  panelShadow: '0 18px 48px rgba(0,0,0,.55)',
} as const;
