#!/usr/bin/env node
// Build the public demo account — the one the README hands to a reviewer.
//
//   node scripts/seed-demo.js --dry-run   # do everything, then ROLLBACK
//   node scripts/seed-demo.js             # do everything, then COMMIT
//
// Idempotent: the first statement deletes the existing `Demo` user, and every
// other row hangs off that user by an ON DELETE CASCADE foreign key, so a
// re-run rebuilds from nothing rather than doubling up. Everything happens in
// one transaction — a failure halfway leaves no half-built account behind.
//
// WHY A SCRIPT AND NOT THE API. `POST /api/auth/register` returns 403 as its
// first statement while the project is in development. Nothing else stands in
// the way: `authService.login` looks a user up by username and bcrypt-compares,
// so a directly-inserted row signs in through the normal path.
//
// WHY THE MEMORY STATE IS COMPUTED AND NOT FAKED. Hand-written `stability` /
// `state` / `next_due_at` values disagree with each other the moment anyone
// looks closely: due counts that don't match the ladder, a `mastered` star with
// a 3-day interval. So this generates a plausible *review log* and then replays
// it through `src/services/fsrs.js` — the real scheduler, the same code path
// `scripts/replay-fsrs.js` uses. Every derived field is therefore exactly what
// the app would have written had someone actually studied this way.
//
// Deliberately NOT calling replay-fsrs.js: that script rebuilds every card in
// the database, which on production would rewrite real users' cards too. Same
// arithmetic, no blast radius.
//
// BOOKS. Book bytes never reach the server — the five `book_progress` rows are
// metadata only, so they render in the library as "you have this book, but not
// on this device". A reviewer imports their own EPUB/PDF to exercise the reader.

const crypto = require("crypto");
const bcrypt = require("bcrypt");
const pool = require("../src/db");
const fsrs = require("../src/services/fsrs");

const DRY_RUN = process.argv.includes("--dry-run");

/* ── what the demo account is ──────────────────────────────────────────── */

const USERNAME = "Demo";
const PASSWORD = "Demo123.";
const EMAIL = "demo@aogimi.com";
const DISPLAY_NAME = "Demo";

// Pinned, not the column's random default. The sky's arrangement derives from
// (sky_seed, deck uuid, card uuid), so a fixed seed keeps the star map stable
// across re-runs — which is what lets a README screenshot stay accurate.
const SKY_SEED = "a3f1c07e59b284d6";

// Deliberately uneven. Six decks of the same size read as generated at a glance,
// both in the deck list and in the shape of the constellations. Sums to 200.
const DECKS = [
  { name: "N5 Core", description: "The first thousand words.", jlpt: 5, count: 45 },
  { name: "N4 Core", description: "Everyday vocabulary.", jlpt: 4, count: 40 },
  { name: "N3 Bridge", description: "Where reading starts to open up.", jlpt: 3, count: 35 },
  { name: "N2 Steps", description: "Newspaper and essay vocabulary.", jlpt: 2, count: 30 },
  { name: "N1 Reach", description: "The long tail.", jlpt: 1, count: 28 },
  { name: "From my reading", description: "Words picked up mid-book.", jlpt: null, count: 22 },
];

const TOTAL_CARDS = DECKS.reduce((n, d) => n + d.count, 0);

// A year, because `mastered` means stability >= 365 days and stability only
// climbs that far through reviews spaced at real intervals. A three-month
// history produces zero mastered cards and a sky with no four-pointed stars.
const HISTORY_DAYS = 380;

const MS_PER_DAY = 86_400_000;

/* ── deterministic randomness ──────────────────────────────────────────── */

// mulberry32. Seeded from a constant so two runs produce the same account:
// the same words in the same decks on the same days with the same grades.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RNG_SEED = 0x5eed_de30;

let rng = mulberry32(RNG_SEED);

/** Rewind the stream. `planStudy` calls this first so that previewing a plan
 *  and then committing it produce byte-identical accounts, whether that happens
 *  in one process or two. */
const resetRng = () => {
  rng = mulberry32(RNG_SEED);
};

const pick = (n) => Math.floor(rng() * n);
const between = (lo, hi) => lo + rng() * (hi - lo);

/* ── the review-log generator ──────────────────────────────────────────── */

/**
 * One card's intrinsic ease, in [0, 1]. 0 = the user keeps forgetting it,
 * 1 = it stuck the first time. Drives the grade distribution, which is what
 * ultimately decides where the card lands on the rank ladder.
 */
function pickOutcome(ease) {
  const pAgain = 0.18 * (1 - ease);
  const pHard = 0.08 + 0.14 * (1 - ease);
  const pEasy = 0.12 + 0.42 * ease;
  const x = rng();
  if (x < pAgain) return "again";
  if (x < pAgain + pHard) return "hard";
  if (x < pAgain + pHard + pEasy) return "easy";
  return "good";
}

/** How late the user actually was, in days. Most reviews land near the due
 *  date; a few slip; occasionally the account goes quiet for a month. */
function lateness() {
  const x = rng();
  if (x < 0.68) return between(0, 1.5);
  if (x < 0.94) return between(2, 7);
  return between(10, 45);
}

const midnightMs = (ms) => Math.floor(ms / MS_PER_DAY) * MS_PER_DAY;

/**
 * The UTC days this account actually opened the app, ascending.
 *
 * Without this every card schedules itself independently and the log comes out
 * as a smooth two-or-three reviews on all 380 days — a heatmap with no texture
 * and a streak no human has. Real studying is bursty: a session of thirty, then
 * nothing for three days. Reviews snap forward onto these days, so the gaps are
 * shared across every card the way a person's are.
 */
function sessionDays(now) {
  const days = [];
  for (let offset = HISTORY_DAYS; offset >= 0; offset--) {
    if (rng() < 0.4) days.push(midnightMs(now.getTime() - offset * MS_PER_DAY));
  }
  return days;
}

/** The first session on or after `targetMs`, at a plausible hour of that day.
 *  Null once the target runs past the last session — the card is genuinely
 *  due in the future, which is what puts cards in the study queue. */
function snapToSession(targetMs, sessions) {
  const day = sessions.find((s) => s >= targetMs);
  return day === undefined ? null : new Date(day + between(7, 23) * 3_600_000);
}

/**
 * Replay a synthetic study history for one card, returning both the log rows
 * and the persisted card state the log implies. Pure — no DB, no clock beyond
 * the `now` handed in — so the distribution can be checked without a database.
 */
function studyCard({ createdAt, ease, neverStudied }, now, sessions) {
  if (neverStudied) {
    return {
      reviews: [],
      card: {
        state: "new",
        peak_rank: "new",
        reviewed_times: 0,
        difficulty: null,
        stability: null,
        last_outcomes: "",
        last_reviewed_at: null,
        next_due_at: null,
      },
    };
  }

  const reviews = [];
  let prior = { stability: null, difficulty: null, lastReviewedAt: null };
  let peak = "new";
  let outcomes = "";
  let at = snapToSession(createdAt.getTime() + between(0.5, 2) * MS_PER_DAY, sessions);

  // 40 is a backstop, not a target: the loop exits when the next due date falls
  // past the last session, which is what makes next_due_at land in the future
  // the way a real account's does.
  while (at && at <= now && reviews.length < 40) {
    const outcome = pickOutcome(ease);
    const before = { ...prior };
    const result = fsrs.review(prior, outcome, at);

    reviews.push({
      at,
      outcome,
      difficulty_before: before.difficulty,
      difficulty_after: result.difficulty,
      stability_before: before.stability,
      stability_after: result.stability,
      state_before: fsrs.rankOf(before.stability),
      state_after: fsrs.rankOf(result.stability),
      elapsed_days: result.elapsedDays ?? 0,
    });

    peak = fsrs.maxRank(peak, fsrs.rankOf(result.stability));
    outcomes = (outcomes + { again: "A", hard: "H", good: "G", easy: "E" }[outcome]).slice(-5);
    prior = { stability: result.stability, difficulty: result.difficulty, lastReviewedAt: at };
    at = snapToSession(at.getTime() + (result.intervalDays + lateness()) * MS_PER_DAY, sessions);
  }

  const last = reviews[reviews.length - 1];
  return {
    reviews,
    card: {
      state: fsrs.rankOf(prior.stability),
      peak_rank: peak,
      reviewed_times: reviews.length,
      difficulty: prior.difficulty,
      stability: prior.stability,
      last_outcomes: outcomes,
      last_reviewed_at: last ? last.at : null,
      next_due_at: last
        ? new Date(last.at.getTime() + fsrs.intervalDays(prior.stability) * MS_PER_DAY)
        : null,
    },
  };
}

/* ── when each card was added ──────────────────────────────────────────── */

/**
 * The sky draws one constellation per UTC day of `cards.created_at`, so the
 * spread of add-dates *is* the shape of the map. Walking backwards in uneven
 * gaps and adding cards in uneven bursts gives a sky with big nights and thin
 * ones, instead of 200 stars in a single blob.
 */
function addDates(count, now) {
  const days = [];
  for (let offset = HISTORY_DAYS; offset > 2; offset -= Math.round(between(3, 13))) {
    days.push(offset);
  }

  // Recency-weighted. A learner adds more words as they read more, and it is
  // the recent additions that keep the `new` and `met` tiers populated at all —
  // a card more than a couple of months old has had time to climb past both.
  // (An earlier flat cycle through `days` packed every card into the oldest
  // third of the year and produced a sky that was 90% `learned`.)
  const weights = days.map((offset) => 0.35 + 1.65 * (1 - offset / HISTORY_DAYS));
  const total = weights.reduce((a, b) => a + b, 0);

  const dates = [];
  const on = (offset) =>
    new Date(now.getTime() - offset * MS_PER_DAY + between(0, 20) * 3_600_000);

  for (const [i, offset] of days.entries()) {
    const share = Math.round((weights[i] / total) * count);
    for (let n = 0; n < share && dates.length < count; n++) dates.push(on(offset));
  }
  // Rounding leaves a few short; they go on the most recent days.
  for (let n = 0; dates.length < count; n++) dates.push(on(days[days.length - 1 - (n % 4)]));

  return dates;
}

/**
 * Plan the whole account's history — add dates, per-card ease, and the memory
 * state each card's replayed log implies — with no database and no dictionary
 * involved. Called before anything else draws from `rng`, so the rank spread a
 * run will produce can be checked ahead of touching production:
 *
 *   node -e "const s=require('./scripts/seed-demo'); s.report(s.planStudy(new Date()))"
 */
function planStudy(now) {
  resetRng();
  const sessions = sessionDays(now);
  const dates = addDates(TOTAL_CARDS, now);
  const plan = [];
  let i = 0;

  for (const [d, deck] of DECKS.entries()) {
    for (let n = 0; n < deck.count; n++, i++) {
      const createdAt = dates[i];
      const ageDays = (now - createdAt) / MS_PER_DAY;

      // Older cards skew easier: they are the N5 core the account started on,
      // and they are also the only ones with enough elapsed time to reach
      // `mastered` (stability >= 365 days). Newer cards are rawer, so the sky
      // has a soft front edge instead of a uniform wash.
      const ease = Math.min(1, Math.max(0, between(-0.15, 0.35) + (ageDays / HISTORY_DAYS) * 0.8));
      const neverStudied = rng() < 0.12 || ageDays < 4;

      const { reviews, card } = studyCard({ createdAt, ease, neverStudied }, now, sessions);
      plan.push({ deck: d, createdAt, reviews, card });
    }
  }
  return plan;
}

/** The shape of what a plan produces. Printed by every run, dry or not. */
function report(plan, now = new Date()) {
  const state = { new: 0, met: 0, learned: 0, mastered: 0 };
  const peak = { new: 0, met: 0, learned: 0, mastered: 0 };
  const days = new Set();
  let reviews = 0;
  let due = 0;

  for (const p of plan) {
    state[p.card.state]++;
    peak[p.card.peak_rank]++;
    reviews += p.reviews.length;
    for (const r of p.reviews) days.add(utcDate(r.at));
    if (!p.card.next_due_at || p.card.next_due_at <= now) due++;
  }

  console.log(`${DECKS.length} decks · ${plan.length} cards · ${reviews} reviews`);
  console.log(`  state      new ${state.new} · met ${state.met} · learned ${state.learned} · mastered ${state.mastered}`);
  console.log(`  peak_rank  new ${peak.new} · met ${peak.met} · learned ${peak.learned} · mastered ${peak.mastered}`);
  console.log(`  ${days.size} study days · ${due} cards due now`);
  return { state, peak, reviews, days: days.size, due };
}

/* ── the five books ────────────────────────────────────────────────────── */

// Metadata only — see the header. `file_hash` is a real SHA-256, just of a
// string rather than of a file: the column should look like what the importer
// writes, and no real import will ever collide with it.
const fakeHash = (s) => crypto.createHash("sha256").update(`aogimi-demo:${s}`).digest("hex");

const BOOKS = [
  {
    filename: "kokoro.epub",
    title: "こころ",
    author: "夏目漱石",
    cover_color: "#3B4A63",
    progress: 62,
    spine_index: 34,
    total_spine_items: 56,
    cfi_position: "epubcfi(/6/70!/4/2/12/1:0)",
    language: "ja",
    publisher: "青空文庫",
    dc_identifier: "aozora-000148-773",
    daysAgo: 240,
    lastReadDaysAgo: 3,
  },
  {
    filename: "rashomon.epub",
    title: "羅生門・鼻",
    author: "芥川龍之介",
    cover_color: "#5C3B34",
    progress: 100,
    spine_index: 11,
    total_spine_items: 11,
    cfi_position: "epubcfi(/6/24!/4/2/40/1:0)",
    language: "ja",
    publisher: "青空文庫",
    dc_identifier: "aozora-000879-127",
    daysAgo: 310,
    lastReadDaysAgo: 96,
  },
  {
    filename: "ginga-tetsudou-no-yoru.epub",
    title: "銀河鉄道の夜",
    author: "宮沢賢治",
    cover_color: "#2E3F5C",
    progress: 87,
    spine_index: 9,
    total_spine_items: 10,
    cfi_position: "epubcfi(/6/20!/4/2/8/1:0)",
    language: "ja",
    publisher: "青空文庫",
    dc_identifier: "aozora-000081-456",
    daysAgo: 150,
    lastReadDaysAgo: 12,
  },
  {
    filename: "n3-bunpou-drill.pdf",
    title: "日本語能力試験 N3 文法ドリル",
    author: "アスク出版",
    cover_color: "#4A4038",
    progress: 41,
    page_count: 208,
    has_text_layer: true,
    producer: "Adobe PDF Library 15.0",
    daysAgo: 88,
    lastReadDaysAgo: 6,
    isPdf: true,
  },
  {
    filename: "yotsubato-01.pdf",
    title: "よつばと！ 1",
    author: "あずまきよひこ",
    cover_color: "#5A6B3B",
    progress: 18,
    page_count: 224,
    has_text_layer: false,
    producer: "ScanSnap Manager",
    daysAgo: 27,
    lastReadDaysAgo: 1,
    isPdf: true,
  },
];

/* ── SQL helpers ───────────────────────────────────────────────────────── */

/** Multi-row INSERT in chunks. 200 cards and ~1000 review rows one statement
 *  at a time is a thousand round trips to a remote database; this is a handful. */
async function insertMany(client, prefix, colCount, rows, chunkSize = 200) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const slice = rows.slice(i, i + chunkSize);
    const params = [];
    const tuples = slice.map((row, n) => {
      params.push(...row);
      const base = n * colCount;
      return `(${Array.from({ length: colCount }, (_, k) => `$${base + k + 1}`).join(",")})`;
    });
    await client.query(prefix + tuples.join(","), params);
  }
}

const utcDate = (d) => d.toISOString().slice(0, 10);

/* ── main ──────────────────────────────────────────────────────────────── */

async function main() {
  const now = new Date();
  console.log(DRY_RUN ? "DRY RUN — everything runs, then rolls back\n" : "Seeding the demo account\n");

  // First rng consumer, deliberately: everything below reproduces exactly what
  // `report(planStudy(now))` predicted.
  const plan = planStudy(now);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    /* 1. the user */

    const del = await client.query("DELETE FROM users WHERE username = $1", [USERNAME]);
    if (del.rowCount) console.log(`removed ${del.rowCount} existing '${USERNAME}' account (cascade)`);

    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    const createdAt = new Date(now.getTime() - HISTORY_DAYS * MS_PER_DAY);
    const { rows: userRows } = await client.query(
      `INSERT INTO users
         (username, password_hash, email, display_name, language,
          avatar_index, onboarding_completed, sky_seed, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'en', 3, true, $5, $6, now())
       RETURNING id`,
      [USERNAME, passwordHash, EMAIL, DISPLAY_NAME, SKY_SEED, createdAt],
    );
    const userId = userRows[0].id;
    console.log(`user ${USERNAME} → id ${userId}, sky_seed ${SKY_SEED}`);

    /* 2. real words out of the production dictionary */

    // JLPT-tagged entries with both a reading and an English gloss, taken a
    // fixed number per level.
    //
    // ROW_NUMBER partitioned by level rather than one flat LIMIT: the first
    // version ordered by `jlpt_level DESC` and capped the whole result, so the
    // cap was reached partway through N2 and N1 came back empty.
    //
    // `is_common` is a sort key, not a filter, for the same reason — the common
    // marker is dense in N5 and thin in N1, so filtering on it starves exactly
    // the level that has the least slack. Common words still come first.
    const { rows: words } = await client.query(
      `WITH pool AS (
         SELECT
           w.id,
           w.jlpt_level,
           COALESCE(
             (SELECT wk.kanji FROM word_kanji    wk WHERE wk.word_id = w.id ORDER BY wk.id LIMIT 1),
             (SELECT wr.kana  FROM word_readings wr WHERE wr.word_id = w.id ORDER BY wr.id LIMIT 1)
           ) AS front,
           COALESCE(
             (SELECT wr.kana FROM word_readings wr WHERE wr.word_id = w.id ORDER BY wr.id LIMIT 1),
             ''
           ) AS reading,
           (SELECT array_agg(t.meaning)
              FROM (SELECT meaning FROM word_meanings
                     WHERE word_id = w.id AND lang = 'eng'
                     ORDER BY id LIMIT 3) t) AS meanings,
           ROW_NUMBER() OVER (
             PARTITION BY w.jlpt_level
             ORDER BY w.is_common DESC NULLS LAST, w.id ASC
           ) AS rn
         FROM words w
         WHERE w.jlpt_level IS NOT NULL
           AND EXISTS (SELECT 1 FROM word_readings wr WHERE wr.word_id = w.id)
           AND EXISTS (SELECT 1 FROM word_meanings wm WHERE wm.word_id = w.id AND wm.lang = 'eng')
       )
       SELECT id, jlpt_level, front, reading, meanings
         FROM pool
        WHERE rn <= 400
        ORDER BY jlpt_level DESC, rn ASC`,
    );

    const byLevel = new Map([1, 2, 3, 4, 5].map((l) => [l, []]));
    for (const w of words) byLevel.get(w.jlpt_level)?.push(w);
    console.log(
      "dictionary pool: " +
        [5, 4, 3, 2, 1].map((l) => `N${l} ${byLevel.get(l).length}`).join(" · "),
    );

    for (const deck of DECKS) {
      const available = deck.jlpt
        ? byLevel.get(deck.jlpt).length
        : [...byLevel.values()].reduce((n, a) => n + a.length, 0);
      if (available < deck.count) {
        throw new Error(
          `not enough dictionary entries for "${deck.name}": need ${deck.count}, pool has ${available}. ` +
            `Is the dictionary seeded in this database?`,
        );
      }
    }

    /* 3. decks */

    // One cursor per JLPT bucket, so no word is used twice. The mixed deck draws
    // a level at random, which can drain a small bucket dry — hence the fallback
    // to any level that still has entries, rather than an undefined word and a
    // crash 150 rows into the transaction.
    const cursors = new Map([...byLevel.keys()].map((l) => [l, 0]));
    const remaining = (l) => byLevel.get(l).length - cursors.get(l);
    const take = (level) => {
      const from = remaining(level) > 0 ? level : [5, 4, 3, 2, 1].find((l) => remaining(l) > 0);
      if (from === undefined) throw new Error("dictionary pool exhausted");
      const i = cursors.get(from);
      cursors.set(from, i + 1);
      return byLevel.get(from)[i];
    };

    const deckIds = [];
    const chosen = []; // { deck index, word }
    for (const [d, deck] of DECKS.entries()) {
      const { rows } = await client.query(
        `INSERT INTO decks (user_id, name, description, created_at)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          userId,
          deck.name,
          deck.description,
          new Date(now.getTime() - (HISTORY_DAYS - d * 8) * MS_PER_DAY),
        ],
      );
      deckIds.push(rows[0].id);

      for (let i = 0; i < deck.count; i++) {
        // The mixed deck draws across levels, the way words picked up mid-book do.
        const level = deck.jlpt ?? [5, 4, 3, 2, 1][pick(5)];
        chosen.push({ deck: d, word: take(level) });
      }
    }

    /* 4. context sentences, where the corpus has one */

    const fronts = [...new Set(chosen.map((c) => c.word.front))];
    const { rows: sentenceRows } = await client.query(
      `SELECT DISTINCT ON (word_form) word_form, ja_plain
         FROM example_sentences
        WHERE word_form = ANY($1::text[])
        ORDER BY word_form, length(ja_plain) ASC`,
      [fronts],
    );
    const sentences = new Map(sentenceRows.map((r) => [r.word_form, r.ja_plain]));
    console.log(`context sentences found for ${sentences.size} of ${fronts.length} words`);

    /* 5. cards — the planned history, zipped onto the chosen words */

    const cardRows = [];
    const studied = plan.map((p, i) => ({ ...p, word: chosen[i].word }));

    for (const s of studied) {
      const meanings = (s.word.meanings ?? []).slice(0, 3);
      cardRows.push([
        deckIds[s.deck],
        s.word.front,
        s.word.reading,
        meanings.join("; ").slice(0, 2000),
        "",
        (sentences.get(s.word.front) ?? "").slice(0, 2000),
        s.word.jlpt_level,
        meanings,
        s.card.state,
        s.card.peak_rank,
        s.card.reviewed_times,
        s.card.difficulty,
        s.card.stability,
        s.card.last_outcomes,
        s.card.last_reviewed_at,
        s.card.next_due_at,
        s.createdAt,
      ]);
    }

    // RETURNING id comes back in insertion order, which is how each card is
    // matched back to the review log built for it.
    const cardIds = [];
    for (let i = 0; i < cardRows.length; i += 200) {
      const slice = cardRows.slice(i, i + 200);
      const params = [];
      const tuples = slice.map((row, n) => {
        params.push(...row);
        const base = n * 17;
        return `(${Array.from({ length: 17 }, (_, k) => `$${base + k + 1}`).join(",")})`;
      });
      const { rows } = await client.query(
        `INSERT INTO cards
           (deck_id, front, reading, back, notes, context_sentence, jlpt_level, meanings,
            state, peak_rank, reviewed_times, difficulty, stability, last_outcomes,
            last_reviewed_at, next_due_at, created_at)
         VALUES ${tuples.join(",")}
         RETURNING id`,
        params,
      );
      cardIds.push(...rows.map((r) => r.id));
    }

    /* 6. the review log */

    const reviewRows = [];
    const perDay = new Map();
    studied.forEach((s, i) => {
      for (const r of s.reviews) {
        reviewRows.push([
          cardIds[i],
          userId,
          r.at,
          r.outcome,
          r.difficulty_before,
          r.difficulty_after,
          r.stability_before,
          r.stability_after,
          r.state_before,
          r.state_after,
          r.elapsed_days,
        ]);
        const day = utcDate(r.at);
        perDay.set(day, (perDay.get(day) ?? 0) + 1);
      }
    });

    await insertMany(
      client,
      `INSERT INTO card_reviews
         (card_id, user_id, reviewed_at, outcome, difficulty_before, difficulty_after,
          stability_before, stability_after, state_before, state_after, elapsed_days)
       VALUES `,
      11,
      reviewRows,
    );

    /* 7. study_days — the rollup the ledger reads instead of aggregating the log */

    await insertMany(
      client,
      "INSERT INTO study_days (user_id, studied_on, review_count) VALUES ",
      3,
      [...perDay].map(([day, count]) => [userId, day, count]),
    );

    /* 8. books */

    for (const b of BOOKS) {
      await client.query(
        `INSERT INTO book_progress
           (user_id, filename, title, author, cover_color, cfi_position, spine_index,
            total_spine_items, progress, file_hash, content_hash, pdf_id_original,
            page_count, has_text_layer, producer, dc_identifier, language, publisher,
            fingerprint_version, started_at, last_read_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,1,$19,$20,$19)`,
        [
          userId,
          b.filename,
          b.title,
          b.author,
          b.cover_color,
          b.cfi_position ?? null,
          b.spine_index ?? 0,
          b.total_spine_items ?? null,
          b.progress,
          fakeHash(b.filename),
          b.isPdf ? null : fakeHash(`content:${b.filename}`),
          b.isPdf ? fakeHash(`pdfid:${b.filename}`).slice(0, 32).toUpperCase() : null,
          b.page_count ?? null,
          b.has_text_layer ?? null,
          b.producer ?? null,
          b.dc_identifier ?? null,
          b.language ?? null,
          b.publisher ?? null,
          new Date(now.getTime() - b.daysAgo * MS_PER_DAY),
          new Date(now.getTime() - b.lastReadDaysAgo * MS_PER_DAY),
        ],
      );
    }

    /* 9. what we built */

    console.log("");
    report(studied, now);
    console.log(`  ${cardIds.length} cards and ${BOOKS.length} books written`);

    if (DRY_RUN) {
      await client.query("ROLLBACK");
      console.log("\nROLLED BACK — nothing was written. Re-run without --dry-run to commit.");
    } else {
      await client.query("COMMIT");
      console.log(`\nCOMMITTED. Sign in as ${USERNAME} / ${PASSWORD}`);
    }
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await pool.end();
}

module.exports = { planStudy, report, studyCard, addDates, DECKS, TOTAL_CARDS, HISTORY_DAYS };

if (require.main === module) {
  main().catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
}
