/**
 * The two sizes an entry is drawn at.
 *
 * `full` is the `/dictionary` entry card (page 03) and the reader's modal —
 * the entry has most of a screen, so the headword is set at 76px and the
 * kanji cards sit two to a row. `compact` is the reader's docked column,
 * 320–480px wide, where every one of those numbers is wrong: the headword
 * overflows, the grid collapses to slivers, and the action can't share a line
 * with anything.
 *
 * One prop rather than a second set of components, because the two are the same
 * entry: same sections in the same order, same data, same rules about what's
 * omitted. Only the scale differs, and a fork would drift the moment either side
 * gained a field.
 *
 * The values live here rather than inside the components so the panes, the kanji
 * cards they contain, the kanji entry and the result rows all step down
 * together — a 44px headword above a 52px kanji glyph is the kind of mismatch
 * that only shows up on the narrow surface.
 */
export type EntryScale = 'full' | 'compact';

type PaneScale = {
  /** The pane's own padding. The surface owns the fill and the edge (the
   *  gradient card on `/dictionary`, the modal, the docked column); the entry
   *  owns the inset. Page 03: `32px 36px 36px`. */
  pad: string;
  /** Space between the header row and the word block. */
  header: string;
  /** The word block — headword beside the action, or stacked. */
  heroRow: string;
  /** Extra classes for the action `Button`. Compact goes full width. */
  action: string;
  headword: string;
  /** The kana reading under the headword. */
  reading: string;
  /** The chip row under the reading. */
  chipRow: string;
  /** `JlptChip` size in the word block. */
  chip: 'sm' | 'md';
  /** The pitch diagram's wrapper. Its width is a fixed 30px per mora, so a long
   *  reading is wider than a narrow column and has to be allowed to scroll —
   *  shrinking the diagram instead would make the one thing on the page that is
   *  a *measurement* unreadable. */
  pitch: string;
  /** Top margin on the Meanings section (the first below the word block). */
  meanings: string;
  /** Top margin on every later section. */
  section: string;
  /** The kanji-card grid. Compact never splits into columns. */
  kanjiGrid: string;
};

export const ENTRY_SCALE: Record<EntryScale, PaneScale> = {
  full: {
    pad: 'px-9 pt-8 pb-9',
    header: 'mt-5',
    heroRow: 'flex flex-wrap items-start justify-between gap-6',
    action: '',
    headword: 'text-[76px] leading-none tracking-[0.02em]',
    reading: 'mt-3 text-[22px]',
    chipRow: 'mt-3.5 gap-2',
    chip: 'md',
    pitch: '',
    meanings: 'mt-9',
    section: 'mt-[34px]',
    kanjiGrid: 'gap-4 lg:grid-cols-2',
  },
  compact: {
    pad: 'px-5 pt-5 pb-6',
    header: 'mt-4',
    heroRow: 'flex flex-col gap-4',
    action: 'w-full justify-center',
    headword: 'text-[44px] leading-none tracking-[0.02em]',
    reading: 'mt-2 text-[15px]',
    chipRow: 'mt-2.5 gap-1.5',
    chip: 'sm',
    pitch: 'max-w-full overflow-x-auto',
    meanings: 'mt-6',
    section: 'mt-6',
    kanjiGrid: 'gap-3',
  },
};
