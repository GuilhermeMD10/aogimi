'use client';

import { Chip, JlptChip, MeaningRow, stageColor, stageLabel } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { displayedRank } from '@/features/sky/lib/fsrs';
import type { CardRecord } from '@/features/sky/stage/types';
import type { DisplayPrefs } from '../types';
import { cloze } from '../lib/clozeContext';

type Props = {
  card: CardRecord;
  prefs: DisplayPrefs;
  side: 'front' | 'back';
};

const JP = 'font-[family-name:var(--face-jp)]';
const WORD = cn(JP, 'font-medium tracking-[0.02em] text-(--ink) break-words');
const READING = cn(JP, 'text-[18px] leading-none font-medium text-(--accent)');
const DIVIDER = 'h-px w-12 bg-[rgb(var(--line-rgb)/0.12)]';

/**
 * What's printed on the flashcard, per side (pages 06 / 07).
 *
 * **Which fields appear is the user's display preference**, which is why this
 * isn't a fixed "the word, alone" front. `production` inverts the card — the
 * meaning prompts and the word answers — and `front.reading` /
 * `front.context` keep their render sites under the word. `front.jlpt` puts
 * the JLPT chip in the card's top-left corner beside the rank chip; the
 * corner mirrors the magnifier on the right. `front.deckName` no longer has a
 * slot: the session header names the deck.
 *
 * Not drawn, by the owner's rulings: the `Verb · 一段` eyebrow (cards carry no
 * part of speech, and no stand-in), the example's English line (G10), the
 * source row (G18).
 *
 * The card is a fixed 460 on both faces (`Flashcard`), so each face is a
 * scroller: `my-auto` on the inner column centres it while it fits and lets
 * it scroll from the top once it doesn't — `justify-center` on an overflowing
 * flex column would clip the top instead.
 */
const FACE = 'inner-scroll flex min-h-0 flex-1 flex-col overflow-y-auto';
export function CardBody({ card, prefs, side }: Props) {
  const inverted = prefs.preset === 'production';
  // The chip is the tier the word was added at, so it can't be shown for a card
  // that has no level — `null` covers "on no JLPT list" and "added before the
  // column existed" alike, and neither earns a placeholder.
  const showJlpt = prefs.front.jlpt && card.jlpt_level != null;
  // The *displayed* rank: a card that has reached Learned keeps its tier
  // through a lapse (`fsrs.displayedRank`), the way its star is drawn.
  const rank = displayedRank(card.peak_rank ?? card.state, card.state);
  // The inverted prompt: the glosses if the card has them, else the legacy blob.
  // `meanings` alone is the better prompt — `back` on a dictionary-made card
  // leads with the *reading*, which gives the answer away on the prompt side.
  const meaningPrompt = card.meanings.length > 0 ? card.meanings.join('; ') : card.back;

  const corner = (
    <div className="absolute top-5 left-5 flex items-center gap-2">
      <Chip dot={stageColor(rank)}>{stageLabel(rank)}</Chip>
      {showJlpt && <JlptChip level={card.jlpt_level} />}
    </div>
  );

  if (side === 'front') {
    return (
      <>
        {corner}
        <div className={FACE}>
          <div className="my-auto flex flex-col items-center gap-[22px] text-center">
            {inverted ? (
              <div className="max-w-[46ch] font-[family-name:var(--face-ui)] text-[24px] leading-[1.4] font-medium whitespace-pre-line text-(--ink-2)">
                {meaningPrompt}
              </div>
            ) : (
              <>
                <div className={cn(WORD, 'text-[68px] leading-[1.15]')}>{card.front}</div>
                {prefs.front.reading && card.reading.length > 0 && <div className={READING}>[{card.reading}]</div>}
                {prefs.front.context && card.context_sentence.length > 0 && (
                  <div className={cn(JP, 'max-w-[42ch] text-[18px] leading-[1.7] text-(--ink-3)')}>
                    {cloze(card.context_sentence, card.front)}
                  </div>
                )}
              </>
            )}
            <span aria-hidden className={DIVIDER} />
            <div className="flex items-center gap-2 font-[family-name:var(--face-ui)] text-[13px] leading-none font-medium text-(--ink-3)">
              Press
              <kbd className="inline-flex h-6 items-center rounded-full border border-[rgb(var(--line-rgb)/0.12)] bg-(--pane-strong) px-[9px] font-[family-name:var(--face-mono)] text-[10px] leading-none font-medium text-(--ink-2)">
                Space
              </kbd>
              to reveal the back
          </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {corner}
      <div className={FACE}>
        <div className="my-auto flex flex-col gap-[26px]">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={cn(WORD, 'text-[60px] leading-[1.15]')}>{card.front}</div>
            {card.reading.length > 0 && <div className={READING}>[{card.reading}]</div>}
            <span aria-hidden className={DIVIDER} />
        </div>

        {/* MEANING is either/or, never both: on a card that has `meanings`, `back`
            is a *rendering* of the same reading + glosses (see `cardBack`), so
            printing both would print every fact twice.
              - `meanings` non-empty → one numbered row per gloss, wrapping.
              - `meanings` empty (a card added before migration 026, by hand or
                on mobile) → `back` verbatim, line breaks and all. Those blobs
                follow no convention worth parsing.
            Under `production` the meaning was the prompt, so it's already spent. */}
        {!inverted &&
          (card.meanings.length > 0 ? (
            <ol className="m-0 flex list-none flex-wrap gap-2.5 p-0">
              {card.meanings.map((meaning, i) => (
                <li key={i} className="min-w-0 flex-[1_1_200px]">
                  <MeaningRow n={i + 1} className="h-full rounded-(--radius-row)">
                    {meaning}
                  </MeaningRow>
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-(--radius-row) border border-(--hairline) bg-(--pane) px-4 py-3 font-[family-name:var(--face-ui)] text-[15px] leading-[1.45] font-medium whitespace-pre-line text-(--ink)">
              {card.back}
            </div>
          ))}

        {prefs.back.exampleSentence && card.context_sentence.length > 0 && (
          <Example sentence={card.context_sentence} word={card.front} />
        )}
        </div>
      </div>
    </>
  );
}

/** The sentence the card was made from, centred, with the card's front lit
 *  where it first occurs (README → Highlighted word: `ACCENT_SOFT .35`, R4,
 *  `0 4px`). A `食べました` card in a sentence about eating twice lights the
 *  one it was taken from, as far as anyone can tell. */
function Example({ sentence, word }: { sentence: string; word: string }) {
  const at = word ? sentence.indexOf(word) : -1;
  return (
    <p className={cn(JP, 'm-0 text-center text-[18px] leading-[1.7] text-(--ink)')}>
      {at === -1 ? (
        sentence
      ) : (
        <>
          {sentence.slice(0, at)}
          <mark className="rounded-[4px] bg-[rgb(var(--accent-soft-rgb)/0.35)] px-1 text-inherit">{word}</mark>
          {sentence.slice(at + word.length)}
        </>
      )}
    </p>
  );
}
