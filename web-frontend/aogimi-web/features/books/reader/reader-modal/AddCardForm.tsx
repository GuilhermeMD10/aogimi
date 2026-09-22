'use client';

// Page 11 — the card, on one screen: Front (the word), Back (reading, three
// meanings), Context (the sentence), the deck in the header, Cancel / Add to
// sky. Replaces the bubble's select-deck → create-card phases.
//
// The editable surface is **reading + meanings**, not a free-text back. `back`
// is still written to the column, but it's derived from those two by
// `cardBack()` at the POST — the one place in the app that knows the format.
//
// `word` is the front and is read-only: a reader-started card is fronted with
// the string the user highlighted (`食べました`), not the dictionary headword the
// prefill resolved (`食べる`) — see `useCardPrefill`.

import { useMemo, useState } from 'react';
import {
  MAX_CARD_CONTEXT,
  MAX_CARD_MEANING,
  MAX_CARD_MEANINGS,
  MAX_CARD_READING,
  MAX_CARDS_PER_DECK,
  decksApi,
} from '@/features/sky/stage';
import type { CardDraft, DeckRecord } from '@/features/sky/stage';
import { cardBack } from '@/features/dictionary';
import { useAuthedUser } from '@/features/auth/hooks/useAuthedUser';
import { Button, JlptChip, Modal } from '@/shared/components';
import { StarIcon } from '@/shared/icons';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import { cn } from '@/lib/util/cn';
import { DeckSelect } from './DeckSelect';
import { getLastDeckId, setLastDeckId } from './lastDeck';
import { useCardPrefill } from './useCardPrefill';

const UI = 'font-[family-name:var(--face-ui)]';
const JP = 'font-[family-name:var(--face-jp)]';

const LABEL = cn(UI, 'text-[10px] leading-none font-medium tracking-[0.16em] uppercase text-(--ink-3)');
const INPUT = cn(
  'w-full rounded-(--radius-control) border border-(--hairline) bg-(--pane-strong) outline-none',
  'placeholder:text-(--ink-3) focus:border-(--ink) transition-colors duration-120',
);

/** The three fields the user can edit, as the *seed* gives them. */
type Fields = { reading: string; meanings: string[]; context: string };

function seedFields(draft: CardDraft | null, contextSentence?: string): Fields {
  return {
    reading: draft?.reading ?? '',
    meanings: draft?.meanings ?? [],
    context: draft?.contextSentence ?? contextSentence ?? '',
  };
}

export function AddCardForm({
  word,
  draft,
  contextSentence,
  onClose,
  onCreated,
}: {
  word: string;
  /** `null` when the card was started from a raw selection — the prefill then
   *  supplies the seed. Never a blank draft (see `useCardPrefill`). */
  draft: CardDraft | null;
  contextSentence?: string;
  onClose: () => void;
  /** The card is in the deck; the caller closes and toasts. */
  onCreated: (deckName: string) => void;
}) {
  const user = useAuthedUser();

  // ── Seed vs edits ────────────────────────────────────────────────────────
  // `seed` is one source — the request's draft or, failing that, the prefill,
  // never a blend (the 背 / 背広 failure mode). `edits` is what the user typed;
  // a field shows its edit if it has one and the seed otherwise, so a prefill
  // that lands late fills only what hasn't been touched.
  const prefill = useCardPrefill(word, draft === null);
  const resolved = draft ?? prefill;
  const seed = useMemo(() => seedFields(resolved, contextSentence), [resolved, contextSentence]);
  const [edits, setEdits] = useState<Partial<Fields>>({});
  const fields: Fields = { ...seed, ...edits };
  const meaningAt = (i: number) => fields.meanings[i] ?? '';
  const setMeaning = (i: number, value: string) => {
    const next = Array.from({ length: MAX_CARD_MEANINGS }, (_, k) => (k === i ? value : meaningAt(k)));
    setEdits((e) => ({ ...e, meanings: next }));
  };
  const dirty = Object.keys(edits).length > 0;
  const looking = draft === null && prefill === null;

  // ── Decks ────────────────────────────────────────────────────────────────
  const { data, loading: decksLoading } = useFetchWithAbort<DeckRecord[]>(
    (signal) => decksApi.getUserDecks(user.id, signal),
    [user.id],
  );
  // Decks created here, appended to the fetched list without a refetch.
  const [created, setCreated] = useState<DeckRecord[]>([]);
  const decks = useMemo(() => [...(data ?? []), ...created], [data, created]);
  const [pickedDeckId, setPickedDeckId] = useState<string | null>(null);
  // Default: the last deck a card went into, else the first deck with room.
  const deckId = useMemo(() => {
    if (pickedDeckId && decks.some((d) => d.id === pickedDeckId)) return pickedDeckId;
    const last = getLastDeckId();
    const lastDeck = decks.find((d) => d.id === last && d.card_count < MAX_CARDS_PER_DECK);
    return (lastDeck ?? decks.find((d) => d.card_count < MAX_CARDS_PER_DECK))?.id ?? null;
  }, [pickedDeckId, decks]);
  const deck = decks.find((d) => d.id === deckId) ?? null;

  const createDeck = async (name: string) => {
    const made = await decksApi.createDeck({ userId: user.id, name });
    setCreated((c) => [...c, made]);
    setPickedDeckId(made.id);
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const meanings = fields.meanings.map((m) => m.trim()).filter(Boolean).slice(0, MAX_CARD_MEANINGS);
  const canSubmit = !!deck && meanings.length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit || !deck) return;
    const tooLong = meanings.find((m) => m.length > MAX_CARD_MEANING);
    if (tooLong) {
      setError(`Each meaning must be ${MAX_CARD_MEANING} characters or fewer.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    // Built from the *edited* fields, not from `draft`.
    const edited: CardDraft = {
      front: word,
      reading: fields.reading.trim(),
      meanings,
      // A snapshot of the source entry, not something the user authors.
      jlptLevel: resolved?.jlptLevel ?? null,
      contextSentence: fields.context.trim() || undefined,
    };
    try {
      await decksApi.createCard(deck.id, {
        front: edited.front,
        reading: edited.reading,
        meanings: edited.meanings,
        jlptLevel: edited.jlptLevel,
        contextSentence: edited.contextSentence,
        back: cardBack(edited),
      });
      setLastDeckId(deck.id);
      onCreated(deck.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that card.');
      setSubmitting(false);
    }
  };

  // Cancel / Esc / scrim: straight out when nothing was typed, a confirm when
  // something was (page 11 → Behaviour).
  const requestClose = () => {
    if (dirty && !submitting) setConfirmClose(true);
    else onClose();
  };

  return (
    <Modal
      onClose={requestClose}
      title="Add card"
      aria-label="Add card"
      headerEnd={<DeckSelect decks={decks} loading={decksLoading} value={deckId} onChange={setPickedDeckId} onCreate={createDeck} />}
    >
      <form
        className="flex min-h-0 flex-1 flex-col gap-[18px]"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        onKeyDown={(e) => {
          // ⌘Enter / Ctrl+Enter from anywhere in the form, including the
          // textarea, where plain Enter is a newline.
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submit();
          }
        }}
      >
        <div className="grid min-h-0 flex-1 grid-cols-2 items-start gap-[22px] overflow-y-auto">
          {/* ── Left: front + back ─────────────────────────────────────── */}
          <div className="flex flex-col gap-3.5">
            <Divider>Front</Divider>
            <Field label="Word">
              <div className={cn(INPUT, JP, 'flex h-11 items-center gap-2.5 px-3.5 text-[15px] font-bold text-(--ink)')}>
                <span className="min-w-0 flex-1 truncate">{word}</span>
                {resolved?.jlptLevel != null && <JlptChip level={resolved.jlptLevel} />}
              </div>
            </Field>

            <Divider className="mt-1">Back</Divider>
            <Field label="Reading">
              <input
                type="text"
                value={fields.reading}
                onChange={(e) => setEdits((ed) => ({ ...ed, reading: e.target.value }))}
                placeholder={looking ? 'Looking up…' : 'Kana for the front'}
                maxLength={MAX_CARD_READING}
                aria-label="Reading"
                className={cn(INPUT, JP, 'h-11 px-3.5 text-[15px] font-medium text-(--accent)')}
              />
            </Field>
            <Field label="Meanings">
              <div className="flex flex-col gap-2">
                {Array.from({ length: MAX_CARD_MEANINGS }, (_, i) => (
                  <div key={i} className={cn(INPUT, 'flex h-10 items-center gap-2.5 pr-3.5 pl-2.5 focus-within:border-(--ink)')}>
                    <span
                      aria-hidden
                      className={cn(
                        UI,
                        'flex size-5 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--line-rgb)/0.06)] text-[10px] leading-none font-bold text-(--ink-2)',
                      )}
                    >
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={meaningAt(i)}
                      onChange={(e) => setMeaning(i, e.target.value)}
                      placeholder={i === 0 ? (looking ? 'Looking up…' : 'Meaning') : `Add a ${i === 1 ? 'second' : 'third'} meaning…`}
                      aria-label={`Meaning ${i + 1}`}
                      className={cn(UI, 'min-w-0 flex-1 bg-transparent text-[13px] font-medium text-(--ink) outline-none placeholder:text-(--ink-3)')}
                    />
                  </div>
                ))}
              </div>
            </Field>
          </div>

          {/* ── Right: context ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-3.5">
            <Divider>Context</Divider>
            <Field label="Context · JP">
              <textarea
                value={fields.context}
                onChange={(e) => setEdits((ed) => ({ ...ed, context: e.target.value }))}
                placeholder="The sentence where you found this word…"
                maxLength={MAX_CARD_CONTEXT}
                aria-label="Context sentence"
                rows={4}
                className={cn(INPUT, JP, 'min-h-24 resize-none px-3.5 py-2.5 text-[15px] leading-[1.7] font-medium text-(--ink)')}
              />
            </Field>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className={cn(
              UI,
              'rounded-(--radius-control) border border-[rgb(var(--danger-rgb)/0.35)] bg-[rgb(var(--danger-rgb)/0.12)] px-3 py-2 text-[12.5px] font-medium text-(--danger)',
            )}
          >
            {error}
          </p>
        )}

        {confirmClose ? (
          <div className={cn(UI, 'flex items-center justify-end gap-2.5')}>
            <span className="mr-auto text-[13px] font-medium text-(--ink-2)">Discard this card?</span>
            <Button variant="white" onClick={() => setConfirmClose(false)}>
              Keep editing
            </Button>
            <Button variant="danger" onClick={onClose}>
              Discard
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2.5">
            <Button variant="white" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit} icon={<StarIcon size={15} />} kbd="->" className="text-[14px]">
              {submitting ? 'Adding…' : 'Add to sky'}
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
}

// ── Bits ────────────────────────────────────────────────────────────────────

/** `Front ───────` — a 13/500 label with a hairline filling the rest. */
function Divider({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn(UI, 'flex items-center gap-3', className)}>
      <span className="text-[13px] leading-none font-medium text-(--ink)">{children}</span>
      <span aria-hidden className="h-px flex-1 bg-[rgb(var(--line-rgb)/0.08)]" />
    </div>
  );
}

// A `div`, not a `<label>`: Meanings holds three inputs and Word holds none,
// so the inputs carry their own `aria-label`s and this only draws the caption.
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      {children}
    </div>
  );
}
