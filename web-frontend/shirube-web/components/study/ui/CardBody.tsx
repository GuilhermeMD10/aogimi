'use client';

import type { CardRecord } from '../../decks/types';
import type { DisplayPrefs } from '../types';
import { cloze } from '../utils/clozeContext';

type Props = {
  card: CardRecord;
  prefs: DisplayPrefs;
  deckName: string;
  side: 'front' | 'back';
};

// Card content renderer — same conditional shape as mobile. One slot
// for the context sentence (clozed on front, full on back) so the
// information density doesn't double up across sides.
export function CardBody({ card, prefs, deckName, side }: Props) {
  const isProduction = prefs.preset === 'production';
  const isFront = side === 'front';

  if (isProduction) {
    return (
      <div className="flex w-full flex-col items-center gap-3 text-center">
        {prefs.front.deckName && deckName.length > 0 && isFront && (
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lgc-fg-subtle">
            {deckName}
          </div>
        )}
        {isFront ? (
          <div className="max-w-115 px-3 text-lg leading-relaxed text-lgc-fg @md:text-xl">
            {card.back}
          </div>
        ) : (
          <>
            <div className="font-jp text-[48px] font-medium leading-none tracking-tight text-lgc-fg @sm:text-[64px] @md:text-[80px]">
              {card.front}
            </div>
            {card.reading.length > 0 && (
              <div className="font-jp text-xl text-lgc-fg-muted">{card.reading}</div>
            )}
            {prefs.back.exampleSentence && card.context_sentence.length > 0 && (
              <div className="max-w-115 font-jp text-[15px] leading-relaxed text-lgc-fg">
                {card.context_sentence}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  const showContextOnFront =
    isFront && prefs.front.context && card.context_sentence.length > 0;
  const showContextOnBack =
    !isFront && prefs.back.exampleSentence && card.context_sentence.length > 0;

  return (
    <div className="flex w-full flex-col items-center gap-3 text-center">
      {prefs.front.deckName && deckName.length > 0 && (
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lgc-fg-subtle">
          {deckName}
        </div>
      )}
      <div className="font-jp text-[48px] font-medium leading-none tracking-tight text-lgc-fg @sm:text-[64px] @md:text-[80px]">
        {card.front}
      </div>
      {prefs.front.reading && card.reading.length > 0 && (
        <div className="font-jp text-xl text-lgc-fg-muted">{card.reading}</div>
      )}
      {showContextOnFront && (
        <div className="max-w-115 font-jp text-[15px] leading-relaxed text-lgc-fg-muted">
          {cloze(card.context_sentence, card.front)}
        </div>
      )}

      {!isFront && (
        <>
          <div className="my-1 h-px w-16 bg-lgc-border" />
          {!prefs.front.reading && card.reading.length > 0 && (
            <div className="font-jp text-xl text-lgc-fg-muted">{card.reading}</div>
          )}
          <div className="max-w-115 px-3 text-lg leading-relaxed text-lgc-fg @md:text-xl">
            {card.back}
          </div>
          {showContextOnBack && (
            <div className="max-w-115 font-jp text-[15px] leading-relaxed text-lgc-fg">
              {card.context_sentence}
            </div>
          )}
        </>
      )}
    </div>
  );
}
