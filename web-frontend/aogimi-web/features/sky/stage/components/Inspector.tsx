'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Trash2 } from 'lucide-react';

import { JlptChip, MeaningRow, stageColor, stageLabel } from '@/shared/components';
import { CloseIcon } from '@/shared/icons';
import { cn } from '@/lib/util/cn';

import { intervalLabel, nextDueLabel } from '../lib/cardLabels';
import { getCard } from '../lib/decksApi';
import { rankArgs, shownRank } from '../lib/rankProgress';
import type { SkyCardRecord } from '../types';

/**
 * The selected card, as page 05's dark inspector panel — inside the Sky
 * field, on the right, from under the header to the field's bottom edge. The
 * camera takes a second right inset while it is open (`INSPECTOR_RIGHT` in
 * `SkyView`) so the ringed star is never underneath it.
 *
 * Top to bottom: JLPT chip + rank label · the front · `[reading]` · the
 * schedule line (`Interval: 12h · Next: due now`) · numbered meanings · the
 * context sentence with the word highlighted · then the two actions, pinned to
 * the bottom.
 *
 * **Everything but the context sentence renders from the row the page already
 * holds.** The inventory is the sky's lean projection (`SkyCardRecord`): the
 * faces, the glosses, the rank inputs and `next_due_at`, but not
 * `context_sentence` — the one field this panel shows that nothing else on the
 * page reads. It is fetched by id on open (`useContextSentence`), so the panel
 * paints immediately and the sentence appears when it lands.
 *
 * Drawn on page 05 and deliberately absent, because nothing stores them:
 *   - the pitch-accent polyline — cards carry no pitch data;
 *   - the example's English translation — `context_sentence` is the sentence alone (G10);
 *   - the source row (`星の王子さま · ch. 3`) — cards have no book/chapter field (G18);
 *   - the panel's own `⋯` — a card has no actions beyond the two buttons below.
 *
 * The rank label reads `--stage-*` so it and the star agree (BRIEF §3.6 #2);
 * due-ness is the schedule line's job rather than a second colour on the chip.
 */

/** The full row's `context_sentence`, fetched by id; `''` until it lands or when there is none.
 *  Keyed on the card id, so switching cards drops the previous sentence rather than showing it
 *  under the next word for a frame. */
function useContextSentence(cardId: string): string {
  const [state, setState] = useState<{ id: string; sentence: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getCard(cardId, controller.signal)
      .then((card) => setState({ id: cardId, sentence: card.context_sentence ?? '' }))
      .catch(() => {
        /* offline / aborted — the panel renders without its sentence */
      });
    return () => controller.abort();
  }, [cardId]);

  return state?.id === cardId ? state.sentence : '';
}

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
const GLASS = 'border border-(--field-node-bd) bg-(--field-node)';

type Props = {
  card: SkyCardRecord;
  /** Clear the selection — the × button. */
  onClose: () => void;
  /** Opens the page's confirm step; deletion itself happens there. */
  onRequestDelete: () => void;
};

export function Inspector({ card, onClose, onRequestDelete }: Props) {
  // The *displayed* rank, not the raw column: a card that has reached Learned
  // keeps its tier through a lapse (see `fsrs.displayedRank`), and this label
  // sits beside a star that is already drawn that way.
  const rank = shownRank(rankArgs(card));
  const color = stageColor(rank);
  const sentence = useContextSentence(card.id);

  return (
    <aside
      aria-label={`${card.front} — card detail`}
      className={cn(
        'absolute top-[92px] right-5 bottom-5 z-30 flex w-[340px] max-w-[calc(100%-40px)] flex-col gap-3.5 overflow-y-auto',
        'rounded-(--radius-hero) border border-(--field-panel-bd) bg-(--field-panel) p-[22px] shadow-(--field-panel-shadow)',
        'font-[family-name:var(--face-ui)] text-(--night-ink)',
      )}
      style={{ backdropFilter: 'var(--field-blur)', WebkitBackdropFilter: 'var(--field-blur)' }}
    >
      {/* ── chips + close ── */}
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <JlptChip level={card.jlpt_level} />
          <span className="inline-flex items-center gap-[5px] text-[12px] leading-none font-medium" style={{ color }}>
            <span aria-hidden className="size-1.5 rounded-full" style={{ background: color }} />
            {stageLabel(rank)}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the card detail"
          className={cn(GLASS, 'grid size-8 shrink-0 place-items-center rounded-full text-[rgb(var(--night-ink-rgb)/0.85)]', FOCUS_RING)}
        >
          <CloseIcon size={12} />
        </button>
      </div>

      {/* ── the word ── */}
      <div className="font-[family-name:var(--face-jp)] text-[34px] leading-[1.1] font-bold">{card.front}</div>
      {card.reading && (
        <div className="font-[family-name:var(--face-jp)] text-[14px] leading-none text-(--accent-soft)">
          [{card.reading}]
        </div>
      )}
      <div className="font-[family-name:var(--face-mono)] text-[11px] tracking-[0.04em] text-[rgb(var(--night-ink-rgb)/0.5)]">
        Interval: {intervalLabel(card)} · Next: {nextDueLabel(card)}
      </div>

      {/* ── meanings: the glosses, or `back` on a pre-026 card that has none ── */}
      {card.meanings.length > 0 ? (
        <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
          {card.meanings.map((meaning, i) => (
            <li key={i}>
              <MeaningRow n={i + 1} variant="field">
                {meaning}
              </MeaningRow>
            </li>
          ))}
        </ol>
      ) : (
        card.back && (
          <div className="rounded-(--radius-control) border border-white/10 bg-white/4 px-3 py-[9px] text-[14px] leading-snug font-medium whitespace-pre-line">
            {card.back}
          </div>
        )
      )}

      {sentence && <ContextSentence sentence={sentence} word={card.front} />}

      <div className="flex-1" />

      {/* ── actions ── */}
      <div className="flex shrink-0 items-center gap-2.5">
        <Link
          href={`/dictionary?q=${encodeURIComponent(card.front)}`}
          className={cn(
            GLASS,
            'flex h-11 flex-1 items-center justify-center gap-2 rounded-(--radius-control) text-[13px] leading-none font-medium text-(--night-ink)',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] transition-[background-color] duration-120 ease-[ease] hover:bg-white/12',
            FOCUS_RING,
          )}
        >
          <Search size={14} strokeWidth={2.2} aria-hidden className="text-(--accent-soft)" />
          View in dictionary
        </Link>
        <button
          type="button"
          onClick={onRequestDelete}
          aria-label={`Delete ${card.front}`}
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-full border border-[rgb(var(--danger-rgb)/0.35)] bg-[rgb(var(--danger-rgb)/0.12)] text-(--danger)',
            'transition-[background-color] duration-120 ease-[ease] hover:bg-[rgb(var(--danger-rgb)/0.2)]',
            FOCUS_RING,
          )}
        >
          <Trash2 size={15} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </aside>
  );
}

/** The sentence the card was made from, with the card's front lit where it
 *  occurs — the first match only; a `食べました` card in a sentence about
 *  eating twice lights the one it was taken from, as far as anyone can tell. */
function ContextSentence({ sentence, word }: { sentence: string; word: string }) {
  const at = word ? sentence.indexOf(word) : -1;
  return (
    <p className="m-0 font-[family-name:var(--face-jp)] text-[14px] leading-[1.7] text-[rgb(var(--night-ink-rgb)/0.9)]">
      {at === -1 ? (
        sentence
      ) : (
        <>
          {sentence.slice(0, at)}
          <mark className="rounded-[4px] bg-[rgb(var(--accent-soft-rgb)/0.18)] px-[3px] text-inherit">{word}</mark>
          {sentence.slice(at + word.length)}
        </>
      )}
    </p>
  );
}
