const pool = require("../db");
const cardRepo = require("../repositories/cardRepository");
const cardReviewRepo = require("../repositories/cardReviewRepository");
const studyDayRepo = require("../repositories/studyDayRepository");
const srs = require("./cardSrsService");

/** A replayed review's `reviewedAt` predates the card itself — the route
 *  answers 400, not 404. */
class InvalidReviewTime extends Error {}

// NOTE: this and `updateCard` re-destructure the validated body field by field,
// which means a field added to the zod schema but not listed here passes
// validation, is dropped silently, and lands in the DB as the column default —
// no error anywhere. Add new card fields in BOTH functions (and in the
// repository) or they don't persist.
async function createCard(deckId, { front, reading, back, notes, contextSentence, jlptLevel, meanings }) {
  return await cardRepo.create({ deckId, front, reading, back, notes, contextSentence, jlptLevel, meanings });
}

async function getDeckCards(deckId) {
  return await cardRepo.findByDeck(deckId);
}

// Just the count, for deck badges that don't need the cards themselves.
async function getDueDeckCardCount(deckId) {
  return await cardRepo.countDueByDeck(deckId);
}

async function getCard(id) {
  const card = await cardRepo.findById(id);
  if (!card) throw new Error("Card not found");
  return card;
}

// See the note on `createCard`: every field has to be named here too.
async function updateCard(id, { front, reading, back, notes, state, contextSentence, jlptLevel, meanings }) {
  const card = await cardRepo.update(id, { front, reading, back, notes, state, contextSentence, jlptLevel, meanings });
  if (!card) throw new Error("Card not found");
  return card;
}

/**
 * Apply an SRS outcome to a card. Updates the card's SRS columns,
 * appends an event to card_reviews, and bumps the user's study_days
 * counter. Not transactional: if a later write fails we'd rather have
 * the card state correct (user-facing) than refuse the whole review.
 *
 * **Grading a card that isn't due does nothing.** No memory update, no
 * `card_reviews` row, no `reviewed_times`, no `study_days` bump — the card
 * comes back exactly as it was found. Studying ahead is practice, and practice
 * moves neither direction: it can't earn stability and it can't lose it.
 *
 * This is the *authoritative* check. Clients run the same rule locally so the
 * UI doesn't promise a rank change the server won't make, and skip the request
 * entirely for a card they can see isn't due — but that is an optimisation over
 * this, never a substitute. A client with a skewed clock (or an old build, or
 * curl) still can't grade its way to a free stability increase.
 *
 * **Replayed reviews.** A client may send `reviewedAt` (when the grade really
 * happened) and `clientReviewId` (so a retried POST is a no-op). The due check
 * and the FSRS step then run *as of that moment*. If the moment is earlier than
 * the card's latest review — the phone graded it offline, the web graded it
 * since — the event is slotted into the log and the card's memory state is
 * rebuilt from the log (`refoldCard`). FSRS is a pure fold over
 * (prior state, grade, elapsed days), so every device converges on the same
 * state whatever order their reviews arrive in.
 *
 * Returns `{ ...card, applied }`: `applied: false` means the grade counted for
 * nothing — not due at that instant, or already recorded under this id.
 */
async function reviewCard(userId, cardId, outcome, { clientReviewId = null, reviewedAt = null } = {}) {
  const card = await cardRepo.findById(cardId);
  if (!card) throw new Error("Card not found");

  if (clientReviewId && (await cardReviewRepo.findByClientId(clientReviewId))) {
    return { ...card, applied: false };
  }

  // One clock for the whole call, so the due check and the review timestamp
  // can't straddle a boundary — a card due in 3ms must not be judged "not due"
  // here and then reviewed "on time" a line later. A client time is clamped
  // to the present (skewed phone clocks) and refused if it predates the card.
  const serverNow = new Date();
  let now = reviewedAt ? new Date(reviewedAt) : serverNow;
  if (now > serverNow) now = serverNow;
  if (now < new Date(card.created_at)) {
    throw new InvalidReviewTime("reviewedAt predates the card");
  }

  const outOfOrder = card.last_reviewed_at && now < new Date(card.last_reviewed_at);
  if (outOfOrder) {
    return refoldCard(card, { userId, outcome, now, clientReviewId });
  }

  if (!srs.isDue(card, now)) return { ...card, applied: false };

  const { next, event } = srs.applyOutcome(card, outcome, now);

  const updated = await cardRepo.applySrsUpdate(cardId, next);

  await cardReviewRepo.create({ cardId, userId, clientReviewId, ...eventRow(event) });

  await studyDayRepo.bumpForToday(userId, event.reviewed_at);

  return { ...updated, applied: true };
}

/** The `card_reviews` columns of an `applyOutcome` event, in repo casing. */
function eventRow(event) {
  return {
    reviewedAt:       event.reviewed_at,
    outcome:          event.outcome,
    difficultyBefore: event.difficulty_before,
    difficultyAfter:  event.difficulty_after,
    stabilityBefore:  event.stability_before,
    stabilityAfter:   event.stability_after,
    stateBefore:      event.state_before,
    stateAfter:       event.state_after,
    elapsedDays:      event.elapsed_days,
  };
}

/** The memory state of a card nobody has reviewed — where every fold starts. */
const UNREVIEWED = Object.freeze({
  stability: null,
  difficulty: null,
  state: "new",
  peak_rank: "new",
  last_outcomes: "",
  last_reviewed_at: null,
  next_due_at: null,
});

/**
 * Rebuild a card's memory state from its review log with one more event
 * slotted in by time. Runs in a transaction: the new row, every later row's
 * before/after snapshot (their "before" is now different) and the card are
 * written together or not at all.
 *
 * An event that turns out not to have been due at its moment is dropped from
 * the log — the same result a live not-due grade has (no row) — and, if it is
 * the incoming event, the call reports `applied: false`. `study_days` is
 * bumped for the incoming event only; a dropped historical event keeps the
 * day it once counted toward, which is a rounding error in a heatmap and not
 * worth a second table walk.
 */
async function refoldCard(card, { userId, outcome, now, clientReviewId }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await cardReviewRepo.listByCard(card.id, client);
    const incoming = { id: null, reviewed_at: now, outcome, client_review_id: clientReviewId };
    // Stable insert: a same-instant existing event stays ahead of the new one.
    const events = [...existing, incoming].sort(
      (a, b) => new Date(a.reviewed_at) - new Date(b.reviewed_at) || (a.id === null) - (b.id === null),
    );

    let state = { ...UNREVIEWED };
    let applied = 0;
    let incomingApplied = false;

    for (const ev of events) {
      const at = new Date(ev.reviewed_at);
      if (!srs.isDue(state, at)) {
        if (ev.id !== null) await cardReviewRepo.remove(ev.id, client);
        continue;
      }
      const { next, event } = srs.applyOutcome(state, ev.outcome, at);
      const row = eventRow(event);
      if (ev.id === null) {
        await cardReviewRepo.create({ cardId: card.id, userId, clientReviewId, ...row }, client);
        incomingApplied = true;
      } else {
        await cardReviewRepo.rewriteSnapshot(ev.id, row, client);
      }
      state = next;
      applied += 1;
    }

    const updated = await cardRepo.applySrsFold(card.id, state, applied, client);
    await client.query("COMMIT");

    if (incomingApplied) await studyDayRepo.bumpForToday(userId, now);
    return { ...updated, applied: incomingApplied };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

async function deleteCard(id) {
  const success = await cardRepo.delete(id);
  if (!success) throw new Error("Card not found");
  return true;
}

module.exports = { createCard, getDeckCards, getDueDeckCardCount, getCard, updateCard, reviewCard, deleteCard, InvalidReviewTime };
