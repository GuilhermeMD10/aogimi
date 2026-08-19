'use client';

import { JlptChip } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import type { CardRecord } from '@/features/sky/stage/types';
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
 * **Which fields appear is the user's display preference**, which is why this
 * isn't a fixed "the word, alone" front.
 * `production` inverts the card — the meaning prompts and the word answers —
 * and `front.reading` / `front.context` / `front.jlpt` / `front.deckName` keep
 * their render sites: the JLPT chip sits beside the rank pill, the deck name is
 * the mono label in the front's top-right corner.
 *
 * Type sizes are viewport clamps rather than fixed pixel sizes: a real `back` is
 * often three lines (a reading plus numbered glosses) and a real `front` can be
 * six characters, so a fixed size only works for sample data. No measuring and
 * no shrink-to-fit machinery — just a ceiling.
 */
export function CardBody({ card, prefs, deckName, side }: Props) {
  // `production` is the inverted direction: the meaning is the prompt and the
  // word is the answer. Every other preset prompts with the word.
  const inverted = prefs.preset === 'production';
  const showDeckName = prefs.front.deckName && deckName.length > 0;
  // The chip is the tier the word was added at, so it can't be shown for a card
  // that has no level — `null` covers "on no JLPT list" and "added before the
  // column existed" alike, and neither earns a placeholder.
  const showJlpt = prefs.front.jlpt && card.jlpt_level != null;
  // The inverted prompt: the glosses if the card has them, else the legacy blob.
  // `meanings` alone is the better prompt — `back` on a dictionary-made card
  // leads with the *reading*, which gives the answer away on the prompt side.
  const meaningPrompt = card.meanings.length > 0 ? card.meanings.join('; ') : card.back;

  if (side === 'front') {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <RankPill stage={card.state} />
            {showJlpt && <JlptChip level={card.jlpt_level} />}
          </div>
          {showDeckName && <Caption className="pt-1.5 text-right">{deckName}</Caption>}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-4.5 py-8 text-center">
          {inverted ? (
            <div className="max-w-[46ch] whitespace-pre-line text-[clamp(18px,1.9vw,27px)] leading-[1.4] text-(--soft)">
              {meaningPrompt}
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

      {/* MEANING is either/or, never both: on a card that has `meanings`, `back`
          is a *rendering* of the same reading + glosses (see `cardBack`), so
          printing both would print every fact twice.
            - `meanings` non-empty → a primary / secondary pair, which a
              structured list makes possible: sense one at full size, the
              alternates stepped down.
            - `meanings` empty (a card added before migration 026, by hand or on
              mobile) → `back` verbatim, line breaks and all, exactly as this
              block has always drawn it. Those blobs follow no convention worth
              parsing — a leading kana line and `1.`-numbered glosses are the
              *dictionary's* habit, not a format hand-written cards honour — so
              splitting them would mangle real cards to tidy some of them.
          Under `production` the meaning was the prompt, so it's already spent. */}
      {!inverted && (
        <div className="mt-5.5 border-t border-(--bd-b) pt-5">
          <Caption className="mb-2.25">Meaning</Caption>
          {card.meanings.length > 0 ? (
            // Ordered: JMdict sense order is the frequency order, and `cardBack`
            // numbers them the same way. No visible markers — at two or three
            // short glosses the size step already says which is the primary, and
            // digits in front of them only added furniture.
            <ol className="m-0 list-none p-0">
              {card.meanings.map((meaning, i) => (
                <li
                  key={i}
                  className={
                    i === 0
                      ? 'text-[clamp(18px,1.9vw,27px)] leading-[1.35] text-(--soft)'
                      : 'mt-2 text-[clamp(14px,1.15vw,17px)] leading-[1.45] text-(--muted)'
                  }
                >
                  {meaning}
                </li>
              ))}
            </ol>
          ) : (
            <div className="whitespace-pre-line text-[clamp(18px,1.9vw,27px)] leading-[1.35] text-(--soft)">
              {card.back}
            </div>
          )}
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
              /* A card added by hand carries no example sentence, and most
                 don't. The block keeps its shell and softens instead of
                 vanishing, so the card doesn't change height depending on
                 where it came from. */
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
