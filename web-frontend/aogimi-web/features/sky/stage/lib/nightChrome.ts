/**
 * OUTGOING — the sky/stage session moves every consumer to the `--field-*`
 * block in `styles/ds-tokens.css` (BRIEF §3.6 #1) and deletes this file.
 *
 * The /sky stage's glass-chrome palette — the handover's T_NIGHT values.
 *
 * **Deliberately not in `ds-tokens.css`.** The sky stage is night in BOTH
 * themes (a surface that never varies by theme doesn't get theme tokens), so
 * every piece of chrome floating on it is light-on-dark always. Rank colours
 * are NOT here: dots, bars and pills read `stageColor()`
 * (the `--stage-*` ramp the sky's palette mirrors), so the list chrome and the
 * stars always agree.
 *
 * The exceptions are `active` / `activeBd` / `activeInk`, which reference the
 * themed accent-soft tokens (DESIGN.md → Accent glass) rather than stating a
 * value, so a Kanagawa sky selects in wave blue and a Sakura sky in pink.
 */
export const NIGHT = {
  /* No fill behind the map here: the sky/stage session puts the map inside the
     `--field-bg` panel; until then it floats on the page canvas. */
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
  active: 'rgb(var(--accent-soft-rgb) / .12)',
  activeBd: 'rgb(var(--accent-soft-rgb) / .30)',
  activeInk: 'var(--night-ink)',
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
