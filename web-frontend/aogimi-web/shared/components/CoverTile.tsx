import { cn } from '@/lib/util/cn';

export type CoverColors = { surface: string; ink: string };

type Props = {
  /** Rendered vertically down the spine — unless `image` is set. */
  title: string;
  /** The cover fill + ink. Books get theirs from
   *  `features/books/lib/coverPalette`; the palette is the feature's, not
   *  this primitive's. */
  colors: CoverColors;
  /** Real cover art, when the book carries any. It replaces the spine title
   *  rather than sitting behind it: the artwork already names the book, and
   *  vertical type over a photo is unreadable. */
  image?: string;
  /** 0–100. Omit to leave the spine clean (no strip at all). */
  percent?: number;
  /** The lifted shadow. On for a hero cover, off inside a grid. */
  raised?: boolean;
  /** Sizing lives with the caller: a fixed box on the hero, `aspect-[3/4]`
   *  in the library grid. */
  className?: string;
};

// A book spine: cover colour, the title set vertically in the Japanese face,
// and an optional progress strip pinned to the bottom edge. R14, the
// handoff's cover radius.
export function CoverTile({ title, colors, image, percent, raised = false, className }: Props) {
  const clamped = percent === undefined ? null : Math.max(0, Math.min(100, percent));

  return (
    <div
      className={cn(
        'relative flex justify-center overflow-hidden rounded-(--radius-row) py-3',
        raised && 'shadow-(--shadow-hero)',
        className,
      )}
      style={{ background: colors.surface }}
    >
      {image ? (
        /* A blob: / data: URL read out of IndexedDB, so there is nothing for
           next/image to fetch, resize or cache — it only accepts a remote URL
           or a bundled import. Plain <img> is the correct element here. */
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div
          className="font-[family-name:var(--face-jp)] text-[15px] font-medium [writing-mode:vertical-rl]"
          style={{ color: colors.ink }}
        >
          {title}
        </div>
      )}

      {clamped !== null && (
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[5px]"
          // Not a token: the strip sits on the cover's own fixed fill, never on
          // the canvas, so one white wash is right in every theme.
          style={{ background: 'rgba(255, 255, 255, .16)' }}
        >
          <div className="h-full" style={{ width: `${clamped}%`, background: colors.ink }} />
        </div>
      )}
    </div>
  );
}
