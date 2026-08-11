// ── Backend records ─────────────────────────────────────────────────────────

import type { Rank } from '../lib/fsrs';

export type DeckRecord = {
  id: string;
  user_id: number;
  name: string;
  description: string;
  created_at: string;
};

/**
 * The rank ladder, derived from FSRS stability alone — never from difficulty,
 * never from answer streaks.
 *
 *   new       never reviewed (stability is null)
 *   met       S < 21
 *   learned   21 ≤ S < 365
 *   mastered  S ≥ 365
 *
 * **`seen` was renamed `met` in migration 027**, in the column and not merely
 * in the label map: it had been three vocabularies for one tier (column `seen`,
 * label "Recent", spec "Met").
 *
 * Aliased to `fsrs.Rank` rather than re-declared so the two cannot drift — this
 * name is kept because the card row's field is called `state` and the rest of
 * the app already says `CardState`.
 */
export type CardState = Rank;

export type CardRecord = {
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
   *  editing the front does not recompute it.
   *
   *  **You POST `jlptLevel` and you read `jlpt_level`.** Card reads are
   *  `SELECT *`, so responses are the raw column names with no mapping layer. */
  jlpt_level: number | null;
  /** The first `MAX_MEANINGS_ON_CARD` English glosses, unnumbered (migration
   *  026). Never null — the column is `NOT NULL DEFAULT '{}'` precisely so this
   *  doesn't need `?? []` at every use. `[]` on cards created before the column
   *  existed; those carry their glosses inside `back` instead, which is why
   *  read surfaces fall back to it rather than showing an empty block. */
  meanings: string[];
  /** The highest rank this card has ever held (migration 027). Only ever
   *  climbs. Once it reaches `learned`, `displayedRank()` stops the card's star
   *  from visibly demoting — the lost stability shows as brightness instead. */
  peak_rank: CardState;
  // ── FSRS-6 memory state (migration 027) ───────────────────────────────────
  // The columns date from 022 but their meaning and scale changed completely:
  // difficulty moved from [0.05, 0.95] to [1, 10], and stability from an
  // arbitrary multiplier to days-until-90%-recall.
  /** [1, 10]. **Null until the first review** — FSRS seeds it from the first
   *  grade, so a default would make an unreviewed card look reviewed. */
  difficulty: number | null;
  /** Days for recall probability to fall from 100% to 90%. Null until the
   *  first review. The rank ladder is thresholds on this and nothing else. */
  stability: number | null;
  /** Last 5 outcomes, oldest first, as `A`/`H`/`G`/`E`. **Display only** since
   *  027 — the old ladder counted streaks off it, FSRS does not read it.
   *  `card_reviews` server-side is the real, complete log. */
  last_outcomes: string;
  last_reviewed_at: string | null;
  /** When the card next falls due (migration 023). Null = never reviewed,
   *  which counts as due now. Computed and persisted server-side — read it,
   *  don't recompute it. */
  next_due_at: string | null;
  created_at: string;
};

/**
 * One deck with its full card inventory, as `GET /api/decks/user/:id/cards`
 * returns them — the same deck row as the list endpoint, plus the same card
 * rows as the per-deck endpoint. Built for the star map, which needs every card
 * of every deck in one round trip.
 *
 * Note this is the **backend** shape, not the local-first one: no `syncState`,
 * no `pendingOp`. It is what a hydrate reads, not what the app renders from.
 */
export type DeckWithCards = DeckRecord & { cards: CardRecord[] };

// ── Authoring shape ─────────────────────────────────────────────────────────

/**
 * A card being composed, before it exists.
 *
 * **One type for the whole add-card flow**, which is the point. Before this,
 * the dictionary screen and the reader each built their own `{front, reading,
 * back}` prefill inline, and they had already drifted: one took 2 glosses, the
 * other 3, and *neither* captured `jlpt_level` or kept the glosses structured.
 * Every producer now builds this and it travels unchanged to `createCardLocal`.
 *
 * It lives here rather than in `features/dictionary`, where the builders are,
 * because it describes a *card* and its consumer chain terminates at the cards
 * API. The dictionary is a producer, not the owner.
 *
 * **Field names match the POST body, not the `cards` row** (`jlptLevel`,
 * `contextSentence`) — you POST camelCase and read back snake_case.
 *
 * **There is deliberately no `back`.** `back` is a *rendering* of `reading` +
 * `meanings`, so carrying it here would mean two representations of the same
 * facts travelling together and drifting the moment either is edited. It is
 * derived at the API boundary by `cardBack()` instead — which also means
 * retiring the column later touches that one helper's call sites and nothing
 * else.
 */
export type CardDraft = {
  /** The headword as it goes on the card. For a reader-started card this is
   *  the surface string the user actually highlighted (`食べました`), *not* the
   *  dictionary headword. */
  front: string;
  /** Kana for the front. `''` when the front already *is* the reading, which is
   *  the kana-only-entry case. For a kanji card this is the on-readings and
   *  kun-readings flattened into one `、`-joined string — `cards.reading` is a
   *  single column, so the on/kun distinction is not preserved. */
  reading: string;
  /** Up to `MAX_MEANINGS_ON_CARD` glosses, unnumbered. The numbering is
   *  presentation and belongs in `cardBack()`. */
  meanings: string[];
  /** From the source entry's `jlpt_level`. Null = not on a JLPT list, or
   *  unknown — the two are deliberately indistinguishable. */
  jlptLevel: number | null;
  /** The sentence the word was found in. Optional because most cards have none:
   *  the reader supplies it, and an example sentence stands in only as a
   *  fallback. */
  contextSentence?: string;
};

// ── Local-first sync wrappers ───────────────────────────────────────────────
//
// Decks and cards are pure metadata (small JSON) so the mobile app stores
// the FULL record locally — unlike books, which only need a sync-state
// marker alongside the file on disk. The local store IS the source of truth
// for rendering; backend GETs hydrate it; writes go local-first then
// opportunistically push.

export type SyncState = 'synced' | 'pending';

/**
 * What kind of pending operation a record is waiting to push. Set when a
 * local write happens and the backend push hasn't yet succeeded; cleared on
 * `markSynced`. `'create'` means the backend has no twin yet; the local id
 * is a client-side UUID that gets replaced by the backend id after push.
 * `'update'`/`'delete'` apply to records that already have a real backend id.
 */
export type PendingOp = 'create' | 'update' | 'delete';

export type LocalDeck = DeckRecord & {
  syncState: SyncState;
  pendingOp?: PendingOp;
};

export type LocalCard = CardRecord & {
  syncState: SyncState;
  pendingOp?: PendingOp;
};
