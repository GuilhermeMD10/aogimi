import { PALETTES } from '@/theme/tokens';

/**
 * The sky stage's chrome fills — the two values `palette` does not carry.
 *
 * **These are the panels that float over the star map** — the stage bars, the
 * deck bar, the ledger, the card sheet. They need a fill of their own because
 * `palette.paper` is opaque and a solid slab would punch a hole in a live sky.
 * Deliberately not the dock's material either (`Dock.tsx`'s own `GLASS` block):
 * two different surfaces, kept apart, because the dock is app chrome and this is
 * one feature's.
 *
 * ── Why the panels are light ───────────────────────────────────────────────
 * The palette's baseline is light — **text is black** — and `sky1..3` are the
 * one group that stays dark, because stars need night. A dark panel would put
 * black ink on a near-black ground: the least readable combination in the app.
 *
 * So the panels are light and the sky is not. A light frosted panel over a dark
 * sky keeps `palette.ink` / `soft` / `muted` readable on it with no second ink
 * ramp to maintain — which is why this file is a few lines and the web's
 * equivalent is fifty. Over there the stage is night in *both* themes, so every
 * scrap of chrome has to restate its own ink; here, two inverted fills buy the
 * same result and keep one source of truth for ink.
 *
 * `glass` stays translucent so a floating bar still shows the sky moving behind
 * it. `panel` is near-opaque, because anything you actually *read* should not
 * have a star map running through the letterforms.
 *
 * Rank colours are **not** here. Dots, bars and pills read `RANK_COLORS` from
 * `features/sky/map/lib/palette.ts`, the same ramp the stars are drawn from, so
 * the list chrome and the sky can never disagree. Those are tuned for the dark
 * sky and the flip left them alone.
 */
export const NIGHT = {
  /** Floating chrome that must not hide the sky behind it — bars, pills. */
  glass: 'rgba(255, 255, 255, 0.86)',
  /** Denser, for surfaces you actually read against — sheets, dialogs. */
  panel: 'rgba(255, 255, 255, 0.97)',

  /**
   * **The stage's own background — the sky is night in every theme.**
   *
   * `palette.sky1..3` is the one token group that is dark in Day as well ("the
   * fill behind overscroll", per its comment in `theme/tokens.ts`), top → base,
   * and this is the gradient the stage paints. It is stated here rather than
   * read at the call site so there is exactly one answer to "what colour is the
   * sky", and so that the rule below has somewhere to live.
   *
   * **The stage must never paint `palette.bg`.** It did, and that was a real
   * bug rather than a theoretical one: `palette` resolves to the Day column,
   * whose `bg` is `#f3f2ef`, so the star map was being drawn on near-white with
   * pale rank colours and a `#cfd8ea` label ink. Stars need contrast against
   * night; there is no light mode for this feature, in either theme.
   */
  bgStops: [PALETTES.day.sky1, PALETTES.day.sky2, PALETTES.day.sky3] as const,

  /**
   * Ink for text laid **directly on the night** — the empty states, the
   * signed-out prompt, a spinner. Not for text on `glass`/`panel`, which are
   * light fills and take the ordinary `palette` ink.
   *
   * Taken from the **night** column explicitly, because the screen otherwise
   * reads the static `palette` (= Day, i.e. black ink) and black-on-night is the
   * same unreadable pair the panels were inverted to escape. This is the web's
   * discipline arriving here: where the stage is night in both themes, every
   * scrap of chrome over it has to restate its own ink.
   *
   * Deliberately *not* wired to `usePalette()`. When this screen adopts the
   * theme hook, `sky1..3` and these three are the values that must **not**
   * follow it — both palettes' skies are dark, so following would be harmless
   * for the background, but `bg`, `ink`, `soft` and `faint` would flip and put
   * the bug straight back.
   */
  ink: PALETTES.night.ink,
  soft: PALETTES.night.soft,
  faint: PALETTES.night.faint,
} as const;
