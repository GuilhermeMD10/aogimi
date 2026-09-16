import { READER_THEMES, type ReaderTheme } from './readerStorage';

/**
 * **The dock's material — glass that follows the page, not the app.**
 *
 * DESIGN.md has one rule about glass that this file exists to obey: *"Glass
 * only ever sits on the gradient; it never sits on another glass pane of the
 * same tier."* Every other surface in the app obeys it for free, because every
 * other surface floats over the sky and the palette's tints are cut for that
 * sky. The reader's dock does not: it floats over the **page**, and the page is
 * white, sepia or near-black at the reader's own choosing.
 *
 * A Tier 3 pane — `rgba(255,255,255,0.12)` — is therefore invisible on a white
 * page and a Tier 3 pane on Day's palette is invisible on a dark one. Which
 * palette column the app is in tells you nothing: a reader can run the app in
 * Night and the page in Light. So the dock's wash, its hairline, its rim and
 * its ink all come from here, keyed on the **reader theme**, and the app
 * palette supplies only the one thing DESIGN.md guarantees reads on all three
 * grounds: sakura fill with `#2A1A24` ink, for the dock's primary circle.
 *
 * The values are the Reader compositions' own: Night's dock is Tier 3's
 * `rgba(255,255,255,0.12)` over its dark page, Day's is
 * `rgba(255,255,255,0.85)` over its light one. Sepia has no composition and is
 * derived from Light — warmed, so a cold white pane does not sit on a warm page
 * looking like a hole in it.
 */
export type ReaderChrome = {
  /** Idle wash. */
  fill: string;
  /** Pressed wash — one step denser, the same relationship the glass tiers use. */
  fillPressed: string;
  /** The 1px hairline. */
  bd: string;
  /** The specular top edge. Transparent where the wash is already near-opaque
   *  and has no light to catch. */
  rim: string;
  /** Ink on the wash. Taken from the page's own foreground, so the dock's
   *  glyphs are the same colour as the text they float over. */
  ink: string;
  /** The secondary ink — a shortcut's label under its glyph. */
  inkMuted: string;
  /** Which way a live blur tints. Follows the page, not the app theme. */
  blurTint: 'light' | 'dark';
  /** What the pane casts. A dark page takes a black shadow; a light one takes
   *  the ink's own hue at low opacity, because black on warm white reads as
   *  grime. */
  shadowColor: string;
  shadowOpacity: number;
};

/** Whether the page is dark enough for a white-tint pane to read on it. */
const DARK_PAGE: Record<ReaderTheme, boolean> = { light: false, sepia: false, dark: true };

export function readerChrome(theme: ReaderTheme): ReaderChrome {
  const ink = READER_THEMES[theme].fg;

  if (DARK_PAGE[theme]) {
    return {
      fill: 'rgba(255, 255, 255, 0.12)',
      fillPressed: 'rgba(255, 255, 255, 0.18)',
      bd: 'rgba(255, 255, 255, 0.14)',
      rim: 'rgba(255, 255, 255, 0.22)',
      ink,
      inkMuted: 'rgba(255, 255, 255, 0.62)',
      blurTint: 'dark',
      shadowColor: '#000000',
      shadowOpacity: 0.35,
    };
  }

  // Sepia keeps the same structure as Light and only shifts the whites warm and
  // the edges onto the page's own brown, which is what stops the dock reading
  // as a cut-out.
  const warm = theme === 'sepia';
  return {
    fill: warm ? 'rgba(255, 252, 246, 0.88)' : 'rgba(255, 255, 255, 0.85)',
    fillPressed: warm ? 'rgba(255, 252, 246, 0.96)' : 'rgba(255, 255, 255, 0.95)',
    bd: warm ? 'rgba(59, 47, 47, 0.12)' : 'rgba(14, 19, 38, 0.08)',
    rim: 'rgba(255, 255, 255, 0)',
    ink,
    inkMuted: warm ? 'rgba(59, 47, 47, 0.62)' : 'rgba(14, 19, 38, 0.55)',
    blurTint: 'light',
    shadowColor: warm ? '#3B2F2F' : '#0E1326',
    shadowOpacity: warm ? 0.12 : 0.1,
  };
}
