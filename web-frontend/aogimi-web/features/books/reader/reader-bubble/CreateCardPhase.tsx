'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { MAX_CARD_BACK, MAX_CARD_CONTEXT, decksApi } from '@/features/study/decks';
import { Button, Eyebrow, HAIRLINE } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { DictPanelHeader } from '../components/DictPanelHeader';
import { PhaseBody } from './PhaseBody';

const FIELD = cn(
  'mt-1.5 w-full resize-none rounded-(--radius-input) border bg-transparent px-3.5 py-3',
  'font-[family-name:var(--face-ui)] text-[13.5px] leading-[1.5] text-(--ink) placeholder:text-(--faint)',
  'outline-none focus:border-(--ink)',
);

/**
 * The card itself.
 *
 * `initialBack` seeds the textarea once and is never read again, which is what
 * lets the reader's late-resolving prefill land here safely — `BubbleContent`
 * resolves it at the transition into this phase, so by the time this mounts the
 * value is final and nothing can overwrite what the user has typed. See
 * `useCardPrefill`.
 */
export function CreateCardPhase({
  word,
  initialBack,
  initialContext,
  deckId,
  deckName,
  onBack,
  onCreated,
  onClose,
}: {
  word: string;
  initialBack: string;
  initialContext?: string;
  deckId: string;
  deckName: string;
  onBack: () => void;
  onCreated: () => void;
  onClose: () => void;
}) {
  const [back, setBack] = useState(initialBack);
  const [context, setContext] = useState(initialContext ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = back.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await decksApi.createCard(deckId, {
        front: word,
        back: trimmed,
        contextSentence: context.trim() || undefined,
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
                'mt-1.5 rounded-(--radius-input) border bg-(--card) px-3.5 py-3',
                'font-[family-name:var(--face-jp)] text-[19px] text-(--ink)',
                HAIRLINE,
              )}
            >
              {word}
            </div>
          </div>

          <div className="mt-4">
            <Eyebrow>Back</Eyebrow>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              maxLength={MAX_CARD_BACK}
              aria-label="Card back"
              className={cn(FIELD, HAIRLINE)}
              rows={5}
              autoFocus
            />
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
              disabled={!back.trim() || submitting}
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
