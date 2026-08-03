'use client';

import { cn } from '@/lib/util/cn';
import type { CardRecord } from '../../decks/types';
import type { DisplayPrefs } from '../types';
import { cloze } from '../lib/clozeContext';
import { Caption } from './Caption';
import { RankPill } from './RankPill';

type Props = {
  card: CardRecord;
  prefs: DisplayPrefs;
  deckName: string;
  side: 'front' | 'back';
};

const WORD = 'font-[family-name:var(--face-jp)] font-bold text-(--ink)';
const READING =
  'font-[family-name:var(--face-mono)] text-[14px] tracking-[0.05em] text-(--muted)';

/**
 * What's printed on the card, per side.
 *
 * The layout is the handoff's; **which fields appear is still the user's display
 * preference**, which is why this isn't the design's "the word, alone" front.
 * `production` inverts the card — the meaning prompts and the word answers —
 * and `front.reading` / `front.context` / `front.deckName` keep their render
 * sites, the last one as the mono label in the front's top-right corner.
 *
 * Type sizes are viewport clamps rather than the handoff's fixed 120px / 46px /
 * 27px: a real `back` is often three lines (a reading plus numbered glosses) and
 * a real `front` can be six characters, so a fixed size only works for the
 * sample data. No measuring and no shrink-to-fit machinery — just a ceiling at
 * the handoff's value.
 */
export function CardBody({ card, prefs, deckName, side }: Props) {
  // `production` is the inverted direction: the meaning is the prompt and the
  // word is the answer. Every other preset prompts with the word.
  const inverted = prefs.preset === 'production';
  const showDeckName = prefs.front.deckName && deckName.length > 0;

  if (side === 'front') {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <RankPill stage={card.state} />
          {showDeckName && <Caption className="pt-1.5 text-right">{deckName}</Caption>}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-4.5 py-8 text-center">
          {inverted ? (
            <div className="max-w-[46ch] whitespace-pre-line text-[clamp(18px,1.9vw,27px)] leading-[1.4] text-(--soft)">
              {card.back}
            </div>
          ) : (
            <>
              <div className={cn(WORD, 'text-[clamp(56px,8.5vw,120px)] leading-none')}>
                {card.front}
              </div>
              {prefs.front.reading && card.reading.length > 0 && (
                <div className={READING}>{card.reading}</div>
              )}
              {prefs.front.context && card.context_sentence.length > 0 && (
                <div className="max-w-[42ch] font-[family-name:var(--face-jp)] text-[17px] leading-[1.75] text-(--muted)">
                  {cloze(card.context_sentence, card.front)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className={cn(WORD, 'text-[clamp(32px,3.6vw,46px)] leading-[1.05] break-words')}>
            {card.front}
          </div>
          {card.reading.length > 0 && <div className={cn(READING, 'mt-2.25')}>{card.reading}</div>}
        </div>
        <RankPill stage={card.state} className="shrink-0" />
      </div>

      {/* MEANING renders `card.back` verbatim, line breaks and all. It is one
          text column: cards made through the reader already carry the reading
          and their numbered glosses on separate lines inside it, so there is
          nothing to split into the handoff's primary / secondary pair without
          inventing a convention the manual add-card form doesn't follow. Under
          `production` the meaning was the prompt, so it's already spent. */}
      {!inverted && (
        <div className="mt-5.5 border-t border-(--bd-b) pt-5">
          <Caption className="mb-2.25">Meaning</Caption>
          <div className="whitespace-pre-line text-[clamp(18px,1.9vw,27px)] leading-[1.35] text-(--soft)">
            {card.back}
          </div>
        </div>
      )}

      {prefs.back.exampleSentence && (
        <div className={cn('mt-5', inverted && 'border-t border-(--bd-b) pt-5')}>
          <Caption className="mb-2.5">Example · 例文</Caption>
          <div className="rounded-(--radius-input) border border-(--paper-bd) bg-(--paper-tile) px-5 py-4.5">
            {card.context_sentence.length > 0 ? (
              <div className="font-[family-name:var(--face-jp)] text-[22px] leading-[1.75] text-(--ink)">
                {card.context_sentence}
              </div>
            ) : (
              /* The handoff has no empty state here, and a card added by hand
                 carries no sentence — most don't. The block keeps its shell and
                 softens instead of vanishing, so the card doesn't change height
                 depending on where the card came from. */
              <div className="text-[13.5px] leading-[1.5] text-(--faint)">
                No example sentence on this card.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
