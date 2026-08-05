/**
 * The two sizes an entry is drawn at.
 *
 * `full` is the `/dictionary` pane — the entry has most of a screen, so the
 * headword can be set at 84px and two columns of body fit side by side.
 * `compact` is the reader's docked column and its bubble, 320–480px wide, where
 * every one of those numbers is wrong: the headword overflows, the two-column
 * grid collapses to slivers, and the hero's "Add to deck" button can't share a
 * line with anything.
 *
 * One prop rather than a second set of components, because the two are the same
 * entry: same sections in the same order, same data, same rules about what's
 * omitted. Only the scale differs, and a fork would drift the moment either side
 * gained a field.
 *
 * The values live here rather than inside the components so the panes, the kanji
 * cards they contain and the kanji entry all step down together — a 44px
 * headword above a 54px kanji glyph is the kind of mismatch that only shows up
 * on the narrow surface.
 */
export type EntryScale = 'full' | 'compact';

type PaneScale = {
  /** The hero band: side padding and vertical rhythm. */
  band: string;
  /** Space under the "Dictionary · 辞書" eyebrow. */
  eyebrow: string;
  /** Hero's outer row — headword block beside the action, or stacked. */
  heroRow: string;
  /** Hero's inner row — headword beside pitch / frame beside meanings, or stacked. */
  heroMain: string;
  /** Extra classes for the hero's `Button`. Compact goes full width. */
  action: string;
  /** Bottom padding on the block that sits beside the glyph when the two share
   *  a baseline; nothing when they're stacked. */
  besidePad: string;
  /** The pitch diagram's wrapper. Its width is a fixed 30px per mora, so a long
   *  reading is wider than a narrow column and has to be allowed to scroll —
   *  shrinking the diagram instead would make the one thing on the page that is
   *  a *measurement* unreadable. */
  pitch: string;
  headword: string;
  /** The mono reading under the headword. */
  reading: string;
  /** The chip row under the reading. */
  chipRow: string;
  /** `JlptChip` size in the hero. */
  chip: 'sm' | 'md';
  /** Bordered pills in the hero — part of speech, kanji facts. */
  pill: string;
  /** Body below the hero. */
  body: string;
  /** The body's section grid. Compact never splits into columns. */
  grid: string;
  /** Top margin on a body section that follows the grid. */
  section: string;
  /** The source credit line. */
  source: string;
};

export const ENTRY_SCALE: Record<EntryScale, PaneScale> = {
  full: {
    band: 'px-11 pt-[30px] pb-7',
    eyebrow: 'mb-[22px]',
    heroRow: 'flex flex-wrap items-end justify-between gap-6',
    heroMain: 'flex flex-wrap items-end gap-7',
    action: '',
    besidePad: 'pb-2',
    pitch: 'pb-2',
    headword: 'text-[84px] leading-[0.92]',
    reading: 'mt-3 text-[20px]',
    chipRow: 'mt-3.5 gap-2',
    chip: 'md',
    pill: 'px-3 py-1 text-[11px]',
    body: 'px-11 pt-7',
    grid: 'gap-[34px] xl:grid-cols-2',
    section: 'mt-8',
    source: 'mt-8 text-[11px]',
  },
  compact: {
    band: 'px-5 pt-[22px] pb-5',
    eyebrow: 'mb-4',
    heroRow: 'flex flex-col gap-4',
    heroMain: 'flex flex-col gap-3',
    action: 'w-full justify-center',
    besidePad: '',
    pitch: 'max-w-full overflow-x-auto',
    headword: 'text-[44px] leading-[0.98]',
    reading: 'mt-2 text-[13px]',
    chipRow: 'mt-2.5 gap-1.5',
    chip: 'sm',
    pill: 'px-[9px] py-0.5 text-[10px]',
    body: 'px-5 pt-5',
    grid: 'gap-6',
    section: 'mt-6',
    source: 'mt-6 text-[10px]',
  },
};
