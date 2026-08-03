'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  MAX_CARDS_PER_DECK,
  MAX_DECKS,
  MAX_DECK_NAME,
  decksApi,
  deckQuotaMessage,
} from '@/features/study/decks';
import type { DeckRecord } from '@/features/study/decks';
import { useAuthedUser } from '@/features/auth/hooks/useAuthedUser';
import { Button, Eyebrow, HAIRLINE, Skeleton } from '@/shared/components';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import { cn } from '@/lib/util/cn';
import { DictPanelHeader } from '../components/DictPanelHeader';
import { PhaseBody } from './PhaseBody';

/** Which deck the card goes in. */
export function SelectDeckPhase({
  word,
  onBack,
  backLabel,
  onSelectDeck,
  onClose,
}: {
  word: string;
  onBack: () => void;
  /** "Dictionary" when there's an in-bubble dictionary to return to, "Cancel"
   *  when backing out just closes — see `BubbleContent`. */
  backLabel: string;
  onSelectDeck: (deckId: string, deckName: string) => void;
  onClose: () => void;
}) {
  const user = useAuthedUser();
  const { data, loading } = useFetchWithAbort<DeckRecord[]>(
    (signal) => decksApi.getUserDecks(user.id, signal),
    [user.id],
  );

  // Read straight from the request. There used to be a local mirror here so a
  // deck created in this phase would appear in the list — but creating one
  // selects it and advances, so that list is never shown again. Coming back
  // remounts this and refetches, which is the server's answer rather than a
  // guess at it, and it drops a mirror-state effect that had nothing to sync.
  const decks = data ?? [];

  // `null` = the new-deck form is closed. Collapses three booleans into the one
  // fact that decides what's on screen.
  const [draft, setDraft] = useState<{ name: string; creating: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft?.name.trim();
    if (!name || draft?.creating) return;
    setDraft({ name, creating: true });
    setError(null);
    try {
      const deck = await decksApi.createDeck({ userId: user.id, name });
      setDraft(null);
      // Straight into the card form — creating a deck here is a step on the way
      // to a card, not an end in itself.
      onSelectDeck(deck.id, deck.name);
    } catch (err) {
      // Was a bare `catch {}`: hitting the deck quota or losing the network
      // closed the form and looked exactly like nothing had happened.
      setError(err instanceof Error ? err.message : 'Could not create that deck.');
      setDraft({ name, creating: false });
    }
  };

  const atQuota = decks.length >= MAX_DECKS;

  return (
    <>
      <DictPanelHeader
        title="Add to deck"
        subtitle="デッキ"
        back={{ label: backLabel, onClick: onBack }}
        onClose={onClose}
      />

      <PhaseBody>
        <p className="font-[family-name:var(--face-ui)] text-[13.5px] text-(--muted)">
          Adding{' '}
          <span className="font-[family-name:var(--face-jp)] text-[15px] font-bold text-(--ink)">
            {word}
          </span>{' '}
          as a flashcard
        </p>

        <Eyebrow className="mt-5 mb-2.5">Choose a deck</Eyebrow>

        {loading ? (
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[50px] w-full" />
            ))}
          </div>
        ) : decks.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {decks.map((deck) => {
              // A full deck isn't offered — picking it would advance to a form
              // whose submit 409s.
              const full = deck.card_count >= MAX_CARDS_PER_DECK;
              return (
                <li key={deck.id}>
                  <button
                    type="button"
                    onClick={() => onSelectDeck(deck.id, deck.name)}
                    disabled={full}
                    className={cn(
                      'flex w-full items-baseline gap-2.5 rounded-(--radius-input) border px-3.5 py-3 text-left',
                      'transition-[border-color] duration-120 ease-[ease]',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
                      full
                        ? 'cursor-not-allowed opacity-45'
                        : 'cursor-pointer hover:border-(--accent)',
                      HAIRLINE,
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate font-[family-name:var(--face-ui)] text-[14px] font-bold text-(--ink)">
                      {deck.name}
                    </span>
                    <span className="shrink-0 font-[family-name:var(--face-mono)] text-[10.5px] text-(--muted)">
                      {full
                        ? 'full'
                        : `${deck.card_count} card${deck.card_count !== 1 ? 's' : ''}`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="font-[family-name:var(--face-ui)] text-[13px] text-(--muted)">
            No decks yet &mdash; create one below.
          </p>
        )}

        {error && (
          <p
            className={cn(
              'mt-3 rounded-(--radius-input) border border-(--danger-bd) bg-(--danger-bg) px-3 py-2',
              'font-[family-name:var(--face-ui)] text-[12.5px] text-(--danger)',
            )}
          >
            {error}
          </p>
        )}

        {atQuota ? (
          <p className="mt-4 font-[family-name:var(--face-ui)] text-[12.5px] text-(--muted)">
            {deckQuotaMessage(decks.length)}
          </p>
        ) : draft ? (
          <form onSubmit={createDeck} className="mt-4 flex gap-2">
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ name: e.target.value, creating: d?.creating ?? false }))}
              placeholder="New deck name"
              aria-label="New deck name"
              maxLength={MAX_DECK_NAME}
              className={cn(
                'min-w-0 flex-1 rounded-(--radius-input) border bg-transparent px-3.5 py-2.5',
                'font-[family-name:var(--face-ui)] text-[14px] text-(--ink) placeholder:text-(--faint)',
                'outline-none focus:border-(--ink)',
                HAIRLINE,
              )}
              autoFocus
            />
            <Button type="submit" disabled={!draft.name.trim() || draft.creating}>
              {draft.creating ? 'Creating…' : 'Create'}
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setDraft({ name: '', creating: false })}
            className={cn(
              'mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-(--radius-input) border px-3 py-2.5',
              'font-[family-name:var(--face-ui)] text-[13.5px] font-bold text-(--soft)',
              'transition-[border-color,color] duration-120 ease-[ease] hover:border-(--accent) hover:text-(--accent)',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
              HAIRLINE,
            )}
          >
            <Plus size={15} strokeWidth={2} aria-hidden />
            New deck
          </button>
        )}
      </PhaseBody>
    </>
  );
}
