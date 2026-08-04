'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import {
  MAX_CARD_CONTEXT,
  MAX_CARD_MEANING,
  MAX_CARD_MEANINGS,
  MAX_CARD_READING,
  decksApi,
} from '@/features/study/decks';
import type { CardDraft } from '@/features/study/decks';
import { cardBack } from '@/features/dictionary';
import { Button, Eyebrow, HAIRLINE, JlptChip } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { DictPanelHeader } from '../components/DictPanelHeader';
import { PhaseBody } from './PhaseBody';

const FIELD = cn(
  'mt-1.5 w-full resize-none rounded-(--radius-input) border bg-transparent px-3.5 py-3',
  'font-[family-name:var(--face-ui)] text-[13.5px] leading-[1.5] text-(--ink) placeholder:text-(--faint)',
  'outline-none focus:border-(--ink)',
);

/** Splits the meanings textarea into the array the API takes: one gloss per
 *  line, blank lines dropped, capped at the column's array limit.
 *
 *  Unnumbered — `1.` / `2.` prefixes are presentation and belong to
 *  `cardBack()`, so they must never reach the editable value or they'd be
 *  numbered twice. */
function parseMeanings(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, MAX_CARD_MEANINGS);
}

/**
 * The card itself.
 *
 * `draft` seeds the fields once and is never read again, which is what lets the
 * reader's late-resolving prefill land here safely — `BubbleContent` resolves it
 * at the transition into this phase, so by the time this mounts the value is
 * final and nothing can overwrite what the user has typed. See `useCardPrefill`.
 *
 * `null` is a real case, not a defensive branch: a card started from a book
 * selection whose lookup found nothing arrives with no draft, and the form's
 * empty state is the answer.
 *
 * The editable surface is **reading + meanings**, not a free-text back. `back` is
 * still written to the column, but it's derived from those two by `cardBack()` at
 * the POST — the one place in the app that knows the format — so the string and
 * the structured fields can't disagree.
 *
 * `word` is the front, and it comes from the phase rather than from
 * `draft.front`: a reader-started card is fronted with the string the user
 * highlighted (`食べました`), not the dictionary headword the prefill resolved
 * (`食べる`). See `useCardPrefill`.
 */
export function CreateCardPhase({
  word,
  draft,
  deckId,
  deckName,
  onBack,
  onCreated,
  onClose,
}: {
  word: string;
  draft: CardDraft | null;
  deckId: string;
  deckName: string;
  onBack: () => void;
  onCreated: () => void;
  onClose: () => void;
}) {
  const [reading, setReading] = useState(draft?.reading ?? '');
  // One textarea, one gloss per line — not three fixed inputs. Three inputs bake
  // the cap into the layout, need add/remove-row chrome before you can delete or
  // reorder a middle gloss, and don't fit the 520px column.
  const [meaningsText, setMeaningsText] = useState(draft?.meanings.join('\n') ?? '');
  const [context, setContext] = useState(draft?.contextSentence ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The JLPT tier is a snapshot of the source entry, not something the user
  // authors — there is no correct value for them to pick. Read-only chip.
  const jlptLevel = draft?.jlptLevel ?? null;

  const meanings = parseMeanings(meaningsText);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (meanings.length === 0 || submitting) return;

    // Surfaced rather than silently truncated: `maxLength` can't express a
    // per-line cap on one textarea, and quietly shortening a gloss the user
    // typed is worse than telling them. The backend rejects it either way.
    const tooLong = meanings.find((m) => m.length > MAX_CARD_MEANING);
    if (tooLong) {
      setError(`Each meaning must be ${MAX_CARD_MEANING} characters or fewer.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    // Built from the *edited* fields, not from `draft` — `cardBack` has to
    // flatten what the user is actually submitting.
    const edited: CardDraft = {
      front: word,
      reading: reading.trim(),
      meanings,
      jlptLevel,
      contextSentence: context.trim() || undefined,
    };

    try {
      await decksApi.createCard(deckId, {
        front: edited.front,
        reading: edited.reading,
        meanings: edited.meanings,
        jlptLevel: edited.jlptLevel,
        contextSentence: edited.contextSentence,
        // The single place a draft becomes a `back` string. Still sent because
        // the column is still there; retiring it is a change to `cardBack`'s
        // call sites and nothing else.
        back: cardBack(edited),
      });
      onCreated();
    } catch (err) {
      // Previously this only cleared `submitting`: a deck at the card quota, or
      // a dropped connection, put the button back and said nothing at all.
      setError(err instanceof Error ? err.message : 'Could not add that card.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <DictPanelHeader
        title="New card"
        subtitle="新しいカード"
        note={`in ${deckName}`}
        back={{ label: 'Decks', onClick: onBack }}
        onClose={onClose}
      />

      <PhaseBody>
        <form onSubmit={handleSubmit}>
          <div>
            <Eyebrow>Front</Eyebrow>
            <div
              className={cn(
                'mt-1.5 flex items-center gap-2.5 rounded-(--radius-input) border bg-(--card) px-3.5 py-3',
                HAIRLINE,
              )}
            >
              <span className="min-w-0 flex-1 font-[family-name:var(--face-jp)] text-[19px] text-(--ink)">
                {word}
              </span>
              {jlptLevel != null && <JlptChip level={jlptLevel} />}
            </div>
          </div>

          <div className="mt-4">
            <Eyebrow>Reading</Eyebrow>
            <input
              type="text"
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              placeholder="Kana for the front…"
              maxLength={MAX_CARD_READING}
              aria-label="Reading"
              className={cn(FIELD, HAIRLINE, 'font-[family-name:var(--face-jp)] text-[15px]')}
            />
          </div>

          <div className="mt-4">
            <Eyebrow>Meanings · one per line</Eyebrow>
            <textarea
              value={meaningsText}
              onChange={(e) => setMeaningsText(e.target.value)}
              placeholder={'to eat\nto drink'}
              // Per-line cap enforced on submit rather than as `maxLength`: the
              // browser's attribute counts the whole textarea, so a total cap
              // here would stop typing on the third gloss.
              aria-label="Meanings, one per line"
              aria-describedby="card-meanings-hint"
              className={cn(FIELD, HAIRLINE)}
              rows={3}
              autoFocus
            />
            <p
              id="card-meanings-hint"
              className="mt-1.5 font-[family-name:var(--face-ui)] text-[11.5px] text-(--faint)"
            >
              Up to {MAX_CARD_MEANINGS}, {MAX_CARD_MEANING} characters each.
            </p>
          </div>

          <div className="mt-4">
            <Eyebrow>Context sentence · optional</Eyebrow>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="The sentence where you found this word…"
              maxLength={MAX_CARD_CONTEXT}
              aria-label="Context sentence"
              className={cn(FIELD, HAIRLINE)}
              rows={2}
            />
          </div>

          {error && (
            <p
              className={cn(
                'mt-4 rounded-(--radius-input) border border-(--danger-bd) bg-(--danger-bg) px-3 py-2',
                'font-[family-name:var(--face-ui)] text-[12.5px] text-(--danger)',
              )}
            >
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <Button variant="secondary" onClick={onBack}>
              Back
            </Button>
            <Button
              type="submit"
              // A card with no glosses isn't a card. This replaces the old
              // `!back.trim()` gate on the free-text field.
              disabled={meanings.length === 0 || submitting}
              icon={<Check size={16} strokeWidth={2} />}
            >
              {submitting ? 'Adding…' : 'Add card'}
            </Button>
          </div>
        </form>
      </PhaseBody>
    </>
  );
}
