import { cn } from '@/lib/util/cn';
import { coverPalette } from './coverPalette';
import { GLASS_SHEEN } from './glass';

type Props = {
  /** Rendered vertically down the spine — unless `image` is set. */
  title: string;
  /** Anything stable per book — filename beats title, which users can edit. */
  seed: string;
  /** Real cover art, when the book carries any. It replaces the spine title
   *  rather than sitting behind it: the artwork already names the book, and
   *  vertical type over a photo is unreadable. */
  image?: string;
  /** 0–100. Omit to leave the spine clean (no strip at all). */
  percent?: number;
  /** The lifted drop shadow. On for a hero cover, off inside a grid. */
  raised?: boolean;
  /** Lay the glass edge treatment over the cover — the library's covers all do.
   *  Purely decorative and `pointer-events: none`, so it never eats a click. */
  sheen?: boolean;
  /** Sizing lives with the caller: a fixed box on the hero, `aspect-[96/140]`
   *  in the library grid. */
  className?: string;
};

// A book spine: cover colour, the title set vertically in the Japanese face,
// and an optional progress strip pinned to the bottom edge.
//
// The title renders as-is rather than as separate Japanese and Latin strings —
// `book_progress` has one `title` column, so there is no second string to put
// here even though the design shows a Japanese spine beside an English
// heading.
export function CoverTile({
  title,
  seed,
  image,
  percent,
  raised = false,
  sheen = false,
  className,
}: Props) {
  const { surface, ink } = coverPalette(seed);
  const clamped = percent === undefined ? null : Math.max(0, Math.min(100, percent));

  return (
    <div
      className={cn(
        'relative flex justify-center overflow-hidden rounded-(--radius-cover) py-3',
        raised && 'shadow-(--cover-shadow)',
        className,
      )}
      style={{ background: surface }}
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
          style={{ color: ink }}
        >
          {title}
        </div>
      )}

      {clamped !== null && (
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[5px]"
          style={{ background: 'var(--covtrack)' }}
        >
          <div className="h-full" style={{ width: `${clamped}%`, background: ink }} />
        </div>
      )}

      {/* Last, so it sits over both the art and the strip. */}
      {sheen && <span aria-hidden className={GLASS_SHEEN} />}
    </div>
  );
}
