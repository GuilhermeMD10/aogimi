/**
 * The /decks stage's glass-chrome palette — the handover's T_NIGHT values.
 *
 * **Deliberately not in `ds-tokens.css`.** The sky stage is night in BOTH
 * themes (the `--deck-sky` / dock convention: a surface that never varies by
 * theme doesn't get theme tokens), so every piece of chrome floating on it is
 * light-on-dark always. Promoting these would widen the palette every screen
 * reads with values only this stage uses — the `--dock-*` reasoning, kept
 * local instead of tokenised because unlike the dock these are one feature's
 * constants, not app chrome. Rank colours are NOT here: dots, bars and pills
 * read `stageColor()` (the `--stage-*` ramp the sky's palette mirrors), so the
 * list chrome and the stars always agree.
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
