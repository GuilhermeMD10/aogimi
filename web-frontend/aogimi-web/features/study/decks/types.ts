// ── Backend `decks` + `cards` row types ─────────────────────────────────────

export interface DeckRecord {
  id: string;
  user_id: number;
  name: string;
  /** Still a column, and still written by the mobile app — the web dropped the
   *  feature, so nothing here reads it. */
  description: string;
  created_at: string;
  card_count: number;
  /** The most recently added card, or null for an empty deck. Assembled
   *  server-side by `deckRepository`, so `card_count` and this always agree.
   *  Present on every deck response. */
  last_card: LastCard | null;
}

/** The subset of a card the decks screen shows under "Last Added Word". Not a
 *  `CardRecord` — the SRS columns aren't selected, because nothing on that
 *  screen reads them and shipping them per deck would be waste. */
export interface LastCard {
  id: string;
  front: string;
  reading: string;
  back: string;
  state: CardState;
  created_at: string;
}

/** One deck with its full card inventory, as `GET /api/decks/user/:userId/cards` returns them —
 *  the same deck row as the list endpoint, plus the same card rows as the per-deck endpoint.
 *  Built for the sky page, which needs every card of every deck in one round trip. */
export type DeckWithCards = DeckRecord & { cards: CardRecord[] };

export type CardState = 'new' | 'seen' | 'learned' | 'mastered';

export interface CardRecord {
  id: string;
  deck_id: string;
  front: string;
  reading: string;
  back: string;
  notes: string;
  context_sentence: string;
  state: CardState;
  reviewed_times: number;
  /** JLPT tier of the source dictionary entry, captured once at add time
   *  (migration 026). 1 = N1 (hardest) … 5 = N5. Null means *unknown*, which
   *  covers both "the word is on no JLPT list" and "this card predates the
   *  column" — the two are indistinguishable on purpose, and every render site
   *  shows nothing rather than a placeholder. A snapshot, not a live join:
   *  editing the front does not recompute it. */
  jlpt_level: number | null;
  /** The first `MAX_MEANINGS_ON_CARD` English glosses, unnumbered (migration
   *  026). `[]` on cards added before the column existed — those carry their
   *  glosses inside `back` instead, which is why read surfaces fall back to it
   *  rather than showing an empty meaning block. Never null: the column is
   *  `NOT NULL DEFAULT '{}'` precisely so this doesn't need `?? []` at
   *  every use. */
  meanings: string[];
  // SRS columns from migration 022.
  difficulty: number;
  stability: number;
  last_outcomes: string;
  last_reviewed_at: string | null;
  /** When the card next falls due (migration 023). Null = never reviewed,
   *  which counts as due now. Computed and persisted server-side — read it,
   *  don't recompute it. */
  next_due_at: string | null;
  created_at: string;
}

// ── Authoring shape ─────────────────────────────────────────────────────────

/**
 * A card being composed, before it exists.
 *
 * **One type for the whole add-card flow**, which is the point. This used to be
 * a positional `(front, back, context?)` triple, re-declared inline in five
 * places — `ReaderBubbleState`, `pendingCard`'s getter, its setter, its
 * `useState` argument and `PendingCardFlow` — two of which had already drifted
 * apart on whether `back` was optional. Every producer (dictionary rail, both
 * entry panes, the reader's prefill) now builds this, and it travels unchanged
 * to `decksApi.createCard`.
 *
 * It lives here rather than in `features/dictionary`, where the builders are,
 * because it describes a *card* and its consumer chain terminates at
 * `createCard`. Dictionary already imports from this barrel for
 * `MAX_MEANINGS_ON_CARD`, so the dependency direction is unchanged.
 *
 * **Field names match the POST body, not the `cards` row** (`jlptLevel`,
 * `contextSentence`), so sending one is a spread plus the derived `back`.
 *
 * **There is deliberately no `back`.** `back` is a *rendering* of `reading` +
 * `meanings`, so carrying it here would mean two representations of the same
 * facts travelling together and drifting the moment either is edited. It's
 * derived at the API boundary by `cardBack()` instead — which also means
 * retiring the column later touches that one helper's call sites and nothing
 * else.
 */
export type CardDraft = {
  /** The headword as it goes on the card. For a reader-started card this is the
   *  surface string the user actually highlighted (`食べました`), *not* the
   *  dictionary headword — see `useCardPrefill`, which resolves an entry for the
   *  other fields while deliberately discarding its front. */
  front: string;
  /** Kana for the front. `''` when the front already *is* the reading, which is
   *  the kana-only-entry case. For a kanji card this is the on-readings and
   *  kun-readings flattened into one `、`-joined string — `cards.reading` is a
   *  single column, so the on/kun distinction is not preserved. */
  reading: string;
  /** Up to `MAX_MEANINGS_ON_CARD` glosses, unnumbered. The numbering is
   *  presentation and belongs in `cardBack()`. */
  meanings: string[];
  /** From the source entry's `jlpt_level`. Null = not on a JLPT list. */
  jlptLevel: number | null;
  /** The sentence the word was found in. Optional because most cards have none:
   *  the reader supplies it, and an example sentence stands in only as a
   *  fallback. */
  contextSentence?: string;
};

// ── UI-facing shapes ────────────────────────────────────────────────────────

/**
 * `CardModel` matches the backend `cards` table columns.
 * `Deck` is the full deck + cards, used in detail/study views.
 * `DeckSummary` is the lightweight version returned by the list endpoint
 * (card_count + last_card, no cards array).
 *
 * None of them carries `description`: the deck-description feature was dropped
 * from the web with the decks redesign. The column and the mobile app's use of
 * it are untouched — see `DeckRecord.description`.
 */

export type CardModel = {
  id: string;
  front: string;
  back: string;
  reading?: string;
  notes?: string;
  context_sentence?: string;
  state?: CardState;
  reviewed_times?: number;
  // Needed by the deck-detail panel: `created_at` is the "Added" sort,
  // and `difficulty` + `last_outcomes` are what `lib/rankProgress` reads to
  // work out how far a card has come toward its next tier.
  created_at?: string;
  difficulty?: number;
  last_outcomes?: string;
  last_reviewed_at?: string | null;
};

export type Deck = {
  id: string;
  name: string;
  cards: CardModel[];
};

export type DeckSummary = {
  id: string;
  name: string;
  card_count: number;
  last_card: LastCard | null;
};

export interface DeckPatch {
  name?: string;
}
