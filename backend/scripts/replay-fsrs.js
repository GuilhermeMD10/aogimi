#!/usr/bin/env node
// Rebuild every card's FSRS-6 memory state by replaying its review history.
//
//   node scripts/replay-fsrs.js            # apply
//   node scripts/replay-fsrs.js --dry-run  # report only, write nothing
//
// Run this AFTER `psql "$DATABASE_URL" -f migrations/027_fsrs6.sql`, which
// leaves every card in a valid-but-unreviewed state.
//
// This is possible at all because `card_reviews` is a complete append-only log
// of `(card_id, reviewed_at, outcome)` — the one thing that cannot be
// reconstructed after the fact, and the reason it is kept. Cards with no
// review rows are already correct and are skipped.
//
// GRADE MAPPING. The old UI had three buttons — Again / Hard / Easy — where
// "Easy" was the *only* success grade a user could reach for, so it carries
// the meaning FSRS assigns to Good, not to Easy. Replaying it as grade 4 would
// apply the easy bonus to every historic success and pin difficulty at the
// floor, producing the 8 → 66 → 397 → 1875 day ladder that reads as broken.
// So historic `easy` replays as grade 3.
//
//   again -> 1 Again      hard -> 2 Hard      easy -> 3 Good
//
// `card_reviews` itself is NOT rewritten. The stored outcome is what the user
// actually pressed, and a log that edits itself is no longer a log.
//
// Idempotent: replay always starts from a blank memory state and derives
// everything from the log, so running it twice gives the same answer.

const pool = require("../src/db");
const fsrs = require("../src/services/fsrs");

const DRY_RUN = process.argv.includes("--dry-run");

/** Historic 3-button outcomes → the grade they actually meant. See the header. */
const REPLAY_GRADE = { again: "again", hard: "hard", good: "good", easy: "good" };

const MS_PER_DAY = 86_400_000;

/**
 * Replay one card's history. Returns the final persisted shape, or null when
 * the card has never been reviewed (nothing to write — the migration already
 * left it correct).
 */
function replay(reviews) {
  if (reviews.length === 0) return null;

  let stability = null;
  let difficulty = null;
  let lastReviewedAt = null;
  let peak = "new";
  let outcomes = "";
  let intervalDays = 1;

  for (const row of reviews) {
    const outcome = REPLAY_GRADE[row.outcome];
    if (!outcome) continue; // unknown vocabulary; skip rather than guess

    const at = new Date(row.reviewed_at);
    const result = fsrs.review({ stability, difficulty, lastReviewedAt }, outcome, at);

    stability = result.stability;
    difficulty = result.difficulty;
    lastReviewedAt = at;
    intervalDays = result.intervalDays;

    peak = fsrs.maxRank(peak, fsrs.rankOf(stability));
    outcomes = (outcomes + { again: "A", hard: "H", good: "G", easy: "E" }[outcome]).slice(-5);
  }

  if (lastReviewedAt === null) return null;

  return {
    stability,
    difficulty,
    state: fsrs.rankOf(stability),
    peak_rank: peak,
    last_outcomes: outcomes,
    last_reviewed_at: lastReviewedAt,
    next_due_at: new Date(lastReviewedAt.getTime() + intervalDays * MS_PER_DAY),
  };
}

async function main() {
  console.log(DRY_RUN ? "DRY RUN — nothing will be written\n" : "Replaying review history\n");

  // One query for the whole log, ordered so a card's rows arrive together and
  // in chronological order. Elapsed time between reviews is the input FSRS
  // cares about most, so the ordering is correctness, not tidiness.
  const { rows } = await pool.query(
    `SELECT card_id, reviewed_at, outcome
       FROM card_reviews
      ORDER BY card_id, reviewed_at ASC`,
  );

  const byCard = new Map();
  for (const row of rows) {
    if (!byCard.has(row.card_id)) byCard.set(row.card_id, []);
    byCard.get(row.card_id).push(row);
  }

  console.log(`${rows.length} reviews across ${byCard.size} cards\n`);

  const rankTally = { new: 0, met: 0, learned: 0, mastered: 0 };
  let written = 0;

  for (const [cardId, reviews] of byCard) {
    const next = replay(reviews);
    if (!next) continue;

    rankTally[next.state]++;

    if (!DRY_RUN) {
      await pool.query(
        `UPDATE cards
            SET stability        = $2,
                difficulty       = $3,
                state            = $4,
                peak_rank        = $5,
                last_outcomes    = $6,
                last_reviewed_at = $7,
                next_due_at      = $8
          WHERE id = $1`,
        [
          cardId,
          next.stability,
          next.difficulty,
          next.state,
          next.peak_rank,
          next.last_outcomes,
          next.last_reviewed_at,
          next.next_due_at,
        ],
      );
    }
    written++;
  }

  console.log(`${written} cards ${DRY_RUN ? "would be" : ""} rebuilt`);
  console.log(
    `  new ${rankTally.new} · met ${rankTally.met} · ` +
      `learned ${rankTally.learned} · mastered ${rankTally.mastered}`,
  );
  console.log(
    "\nCards with no review history keep stability = NULL and rank 'new',\n" +
      "which is what they are. Their peak_rank still carries whatever tier the\n" +
      "old ladder had granted them.",
  );

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
