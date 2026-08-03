'use client';

import { CopyPlus } from 'lucide-react';
import { Button, Eyebrow, HAIRLINE } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { Constellation } from './Constellation';
import { EntryBack } from './EntryBack';
import { JlptChip } from './JlptChip';
import { SectionLabel } from './SectionLabel';
import { kanjiCardDraft } from '../lib/cardDraft';
import { ENTRY_SCALE, type EntryScale } from '../lib/entryScale';
import type { KanjiInfo } from '../types';

/** Values only this pane uses — see `lib/entryScale.ts` for the shared ones. */
const LOCAL: Record<
  EntryScale,
  { frame: string; frameGlyph: string; meanings: string; readings: string }
> = {
  full: {
    frame: 'size-[132px] rounded-(--radius-card)',
    frameGlyph: 'text-[84px]',
    meanings: 'max-w-[420px] text-[22px]',
    readings: 'py-[13px] text-[19px]',
  },
  compact: {
    // A smaller frame keeps the tell (a character is framed, a word isn't)
    // without eating a quarter of a 320px column, and the softer radius keeps
    // the box from reading as a card at that size.
    frame: 'size-[84px] rounded-(--radius-input)',
    frameGlyph: 'text-[52px]',
    meanings: 'text-[17px]',
    readings: 'py-2.5 text-[16.5px]',
  },
};

/**
 * A single character's entry, shown when the selected row is a kanji rather
 * than a word — `/api/search` returns these alongside the words for kanji and
 * kana queries.
 *
 * Deliberately not the same page as a word entry. The glyph sits in a ruled
 * block rather than running as bare type, and the character-only facts
 * (strokes, grade, radical) get a row of their own. A KANJIDIC character and a
 * JMdict word are different kinds of thing, and the layout should say so
 * before you've read a word of it.
 *
 * `scale` and `onBack` mean what they do on `EntryDetail`, for the same reason:
 * the narrow surfaces show this *instead of* their list.
 */
export function KanjiEntryDetail({
  kanji,
  onAddCard,
  scale = 'full',
  onBack,
}: {
  kanji: KanjiInfo;
  onAddCard: (front: string, back: string, context?: string) => void;
  /** `full` is the `/dictionary` pane; `compact` a 320–480px column. */
  scale?: EntryScale;
  /** Present → a "← Results" control in the hero. */
  onBack?: () => void;
}) {
  const pane = ENTRY_SCALE[scale];
  const local = LOCAL[scale];

  const facts = [
    { label: 'Strokes', value: kanji.stroke_count },
    { label: 'Grade', value: kanji.grade },
    { label: 'Radical', value: kanji.radical },
  ].filter((f): f is { label: string; value: number } => f.value != null);

  const addCard = () => {
    const draft = kanjiCardDraft(kanji);
    onAddCard(draft.front, draft.back, draft.context);
  };

  return (
    <article>
      <div className={cn('relative overflow-hidden border-b', pane.band, HAIRLINE)}>
        {/* See EntryDetail — the motif needs a wide band to read as anything. */}
        {scale === 'full' && <Constellation />}

        <div className="relative">
          {onBack && <EntryBack onClick={onBack} />}

          <Eyebrow className={pane.eyebrow}>Kanji · 漢字</Eyebrow>

          <div className={pane.heroRow}>
            <div className={pane.heroMain}>
              {/* The ruled block is the tell: a word entry sets its headword as
                  bare type, a character sits in a frame. */}
              <div
                className={cn(
                  'flex shrink-0 items-center justify-center border-2 bg-(--card)',
                  local.frame,
                  HAIRLINE,
                )}
              >
                <span
                  className={cn(
                    'font-[family-name:var(--face-jp)] leading-none text-(--ink)',
                    local.frameGlyph,
                  )}
                >
                  {kanji.literal}
                </span>
              </div>

              <div className={pane.besidePad}>
                {kanji.meanings.length > 0 && (
                  <p
                    className={cn(
                      'font-[family-name:var(--face-ui)] leading-tight text-(--ink)',
                      local.meanings,
                    )}
                  >
                    {kanji.meanings.join(', ')}
                  </p>
                )}

                <div className={cn('flex flex-wrap items-center', pane.chipRow)}>
                  <JlptChip level={kanji.jlpt_level} size={pane.chip} />
                  {facts.map((f) => (
                    <span
                      key={f.label}
                      className={cn(
                        'inline-flex items-center gap-[5px] rounded-(--radius-chip) border',
                        'font-[family-name:var(--face-mono)] tracking-[0.04em] uppercase',
                        pane.pill,
                        HAIRLINE,
                      )}
                    >
                      <span className="text-(--faint)">{f.label}</span>
                      <span className="text-(--soft)">{f.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <Button
              icon={<CopyPlus size={18} strokeWidth={2} />}
              onClick={addCard}
              className={pane.action}
            >
              Add to deck
            </Button>
          </div>
        </div>
      </div>

      <div className={pane.body}>
        <div className={cn('grid', pane.grid)}>
          {kanji.on_readings.length > 0 && (
            <section>
              <SectionLabel en="On-yomi" jp="音読み" />
              <p
                className={cn(
                  'border-t font-[family-name:var(--face-jp)] leading-[1.5] text-(--ink)',
                  local.readings,
                  HAIRLINE,
                )}
              >
                {kanji.on_readings.join('、')}
              </p>
            </section>
          )}

          {kanji.kun_readings.length > 0 && (
            <section>
              <SectionLabel en="Kun-yomi" jp="訓読み" />
              <p
                className={cn(
                  'border-t font-[family-name:var(--face-jp)] leading-[1.5] text-(--ink)',
                  local.readings,
                  HAIRLINE,
                )}
              >
                {kanji.kun_readings.join('、')}
              </p>
            </section>
          )}
        </div>

        <p
          className={cn(
            'text-right font-[family-name:var(--face-mono)] text-(--faint)',
            pane.source,
          )}
        >
          Source · KANJIDIC2
        </p>
      </div>
    </article>
  );
}
