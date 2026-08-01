'use client';

// The empty library — what a new account sees before its first import. This is
// the *only* empty state on the shelf: the handoff is explicit that first-login
// is the empty state and there shouldn't be a second one.
//
// Three lines explaining the model, and a dropzone to act on it.

import { UploadCloud } from 'lucide-react';
import { Eyebrow } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { DASHED } from './LibraryCards';

const STEPS = [
  {
    kanji: '追',
    title: 'Add a file',
    body: 'Drop in an EPUB or PDF — it stays on your device.',
  },
  {
    kanji: '読',
    title: 'Read & tap',
    body: 'Tap any word to look it up, right where you are.',
  },
  {
    kanji: '満',
    title: 'Fill your sky',
    body: 'Every word you keep becomes a star to look back on.',
  },
] as const;

export function LibraryEmpty({
  onImport,
  importing,
}: {
  onImport: () => void;
  importing: boolean;
}) {
  return (
    <>
      <h2 className="mt-[22px] font-[family-name:var(--face-ui)] text-[34px] leading-[1.15] tracking-[-0.01em] text-(--ink)">
        Let&apos;s bring in your first book.
      </h2>

      <div className="mt-10 grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
        <ol className="flex flex-col gap-5">
          {STEPS.map((step) => (
            <li key={step.kanji} className="flex items-start gap-[15px]">
              <div
                className={cn(
                  'flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-(--radius-button) border',
                  'font-[family-name:var(--face-jp)] text-[18px] text-(--ink)',
                  DASHED,
                )}
                aria-hidden
              >
                {step.kanji}
              </div>
              <div>
                <div className="font-[family-name:var(--face-ui)] text-[15.5px] font-bold text-(--ink)">
                  {step.title}
                </div>
                <div className="mt-[3px] font-[family-name:var(--face-ui)] text-[13.5px] leading-[1.5] text-(--muted)">
                  {step.body}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <Dropzone onImport={onImport} importing={importing} />
      </div>
    </>
  );
}

// Click-only for now: opens the same file picker the Import button does.
//
// The handoff specs a real dropzone — window-wide drop target, drag-over fill,
// a determinate ring with the filename and percentage, `n of m` for a queue.
// That's deferred, so the copy doesn't promise dragging and the component takes
// no drop handlers. The shape is here for the behaviour to land into: the whole
// panel is already the hit target, so wiring `onDrop` later touches this file
// and nothing else.
function Dropzone({ onImport, importing }: { onImport: () => void; importing: boolean }) {
  return (
    <button
      type="button"
      onClick={onImport}
      disabled={importing}
      className={cn(
        'flex h-[330px] w-full cursor-pointer flex-col items-center justify-center gap-3.5 p-6 text-center',
        'rounded-(--radius-card) border-2 border-dashed',
        'transition-opacity duration-120 disabled:cursor-default disabled:opacity-60',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
        DASHED,
      )}
    >
      <div className="flex h-[62px] w-[62px] items-center justify-center rounded-(--radius-pill) bg-(--btn) text-(--btn-ink) shadow-(--card-shadow)">
        <UploadCloud size={29} strokeWidth={1.6} />
      </div>
      <div className="font-[family-name:var(--face-ui)] text-[21px] font-bold text-(--ink)">
        {importing ? 'Adding your book…' : 'Add your first book'}
      </div>
      <div className="font-[family-name:var(--face-ui)] text-[13.5px] text-(--muted)">
        It stays on your device — only your progress syncs.
      </div>
      <Eyebrow className="tracking-[0.22em]">EPUB · PDF</Eyebrow>
    </button>
  );
}
