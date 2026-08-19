#!/usr/bin/env node
// Test-vector harness for `src/services/fsrs.js`.
//
//   node scripts/verify-fsrs.js
//
// Every expected number below was produced by py-fsrs 6.3.1 with
// `Scheduler(learning_steps=[], relearning_steps=[], enable_fuzzing=False)` and
// desired retention 0.9. Stability and difficulty are asserted to 1e-4 (the
// precision the reference table is quoted at); intervals are asserted exactly.
//
// The suite covers each single grade, six consecutive Good, Good×3 → Again →
// Good×2, six Hard, six Easy, an overdue sequence, and a same-day sequence —
// the seven shapes that between them exercise every formula, so a failure
// localises the bug to one of them.
//
// There is no test runner in this repo. This is a script, it exits non-zero on
// failure, and it is the thing to run before trusting any change to fsrs.js.

const fsrs = require('../src/services/fsrs');

const MS_PER_DAY = 86_400_000;
const EPSILON = 1e-4;

let failures = 0;
let checks = 0;

function near(actual, expected, label) {
  checks++;
  if (Math.abs(actual - expected) > EPSILON) {
    failures++;
    console.error(`  ✗ ${label}: got ${actual.toFixed(6)}, want ${expected.toFixed(6)}`);
    return;
  }
  console.log(`  ✓ ${label}: ${actual.toFixed(4)}`);
}

function exact(actual, expected, label) {
  checks++;
  if (actual !== expected) {
    failures++;
    console.error(`  ✗ ${label}: got ${actual}, want ${expected}`);
    return;
  }
  console.log(`  ✓ ${label}: ${actual}`);
}

/**
 * Run a sequence of `{ outcome, elapsed }` steps and assert each row.
 * `elapsed` is days since the previous review (fractions allowed, for the
 * same-day cases); omitted on the first review.
 */
function sequence(name, steps) {
  console.log(`\n${name}`);
  let prior = { stability: null, difficulty: null, lastReviewedAt: null };
  let clock = new Date('2026-01-01T09:00:00.000Z');

  steps.forEach((step, i) => {
    if (i > 0) clock = new Date(clock.getTime() + step.elapsed * MS_PER_DAY);
    const out = fsrs.review(prior, step.outcome, clock);

    const tag = `#${i + 1} ${step.outcome}`;
    if (step.r != null) near(out.retrievability, step.r, `${tag} R`);
    near(out.stability, step.s, `${tag} S`);
    near(out.difficulty, step.d, `${tag} D`);
    exact(out.intervalDays, step.interval, `${tag} interval`);

    prior = { stability: out.stability, difficulty: out.difficulty, lastReviewedAt: clock };
  });
}

/* ── derived constants ─────────────────────────────────────────────────── */

console.log('derived constants');
near(fsrs.DECAY, -0.1542, 'DECAY');
near(fsrs.FACTOR, 0.9803464944134797, 'FACTOR');
// R(S, S) must be exactly 0.9 — this is what FACTOR is defined to make true.
near(fsrs.retrievability(2.3065, 2.3065), 0.9, 'R(S, S)');
near(fsrs.retrievability(0, 5), 1.0, 'R(0, S)');
// D0(1..3) match the reference values exactly.
near(fsrs.initialDifficultyRaw(1), 6.4133, 'D0(1)');
near(fsrs.initialDifficultyRaw(2), 5.1122, 'D0(2)');
near(fsrs.initialDifficultyRaw(3), 2.1181, 'D0(3)');
// The mean-reversion target must be the UNCLAMPED D0(4).
//
// Some write-ups quote this as -4.7723; that constant is a transcription
// slip: `w4 - exp(w5·3) + 1` = `7.4133 - 12.184931` = -4.771631, and the
// same expression reproduces D0(1..3) above to the last quoted digit. It
// makes no practical difference either way — `w7` is 0.001, so the two
// targets move every subsequent difficulty by ~7e-7 — but the harness
// should assert the truth.
near(fsrs.initialDifficultyRaw(4), -4.771631, 'D0(4) unclamped');
near(fsrs.initialDifficulty(4), 1.0, 'D0(4) clamped');

/* ── first review, each grade ──────────────────────────────────────────── */

sequence('first review · Again', [{ outcome: 'again', s: 0.212, d: 6.4133, interval: 1 }]);
sequence('first review · Hard', [{ outcome: 'hard', s: 1.2931, d: 5.1122, interval: 1 }]);
sequence('first review · Good', [{ outcome: 'good', s: 2.3065, d: 2.1181, interval: 2 }]);
sequence('first review · Easy', [{ outcome: 'easy', s: 8.2956, d: 1.0, interval: 8 }]);

/* ── six consecutive Good, on schedule ─────────────────────────────────── */

sequence('all Good', [
  { outcome: 'good', s: 2.3065, d: 2.1181, interval: 2 },
  { outcome: 'good', elapsed: 2, r: 0.9095, s: 10.9643, d: 2.1112, interval: 11 },
  { outcome: 'good', elapsed: 11, r: 0.8998, s: 46.2802, d: 2.1043, interval: 46 },
  { outcome: 'good', elapsed: 46, r: 0.9004, s: 162.8622, d: 2.0975, interval: 163 },
  { outcome: 'good', elapsed: 163, r: 0.8999, s: 497.4472, d: 2.0906, interval: 497 },
  { outcome: 'good', elapsed: 497, r: 0.9001, s: 1345.5288, d: 2.0837, interval: 1346 },
]);

/* ── a lapse in the middle ─────────────────────────────────────────────── */

sequence('Good ×3 → Again → Good ×2', [
  { outcome: 'good', s: 2.3065, d: 2.1181, interval: 2 },
  { outcome: 'good', elapsed: 2, r: 0.9095, s: 10.9643, d: 2.1112, interval: 11 },
  { outcome: 'good', elapsed: 11, r: 0.8998, s: 46.2802, d: 2.1043, interval: 46 },
  { outcome: 'again', elapsed: 46, r: 0.9004, s: 2.9326, d: 7.39, interval: 3 },
  { outcome: 'good', elapsed: 3, r: 0.8984, s: 7.7782, d: 7.3778, interval: 8 },
  { outcome: 'good', elapsed: 8, r: 0.8981, s: 18.7816, d: 7.3657, interval: 19 },
]);

/* ── Hard is a success, not a lapse ────────────────────────────────────── */

sequence('all Hard', [
  { outcome: 'hard', s: 1.2931, d: 5.1122, interval: 1 },
  { outcome: 'hard', elapsed: 1, r: 0.9167, s: 3.2494, d: 6.7405, interval: 3 },
  { outcome: 'hard', elapsed: 3, r: 0.9054, s: 6.7283, d: 7.8214, interval: 7 },
  { outcome: 'hard', elapsed: 7, r: 0.8973, s: 11.9164, d: 8.539, interval: 12 },
  { outcome: 'hard', elapsed: 12, r: 0.8995, s: 18.2363, d: 9.0153, interval: 18 },
]);

/* ── Easy pins D at the floor and applies w16 every time ───────────────── */

sequence('all Easy', [
  { outcome: 'easy', s: 8.2956, d: 1.0, interval: 8 },
  { outcome: 'easy', elapsed: 8, r: 0.9025, s: 65.6242, d: 1.0, interval: 66 },
  { outcome: 'easy', elapsed: 66, r: 0.8996, s: 396.775, d: 1.0, interval: 397 },
  { outcome: 'easy', elapsed: 397, r: 0.9, s: 1874.917, d: 1.0, interval: 1875 },
  { outcome: 'easy', elapsed: 1875, r: 0.9, s: 7265.4329, d: 1.0, interval: 7265 },
]);

/* ── overdue: the spacing effect ───────────────────────────────────────── */
// Review 2 reaches S = 51.1 instead of the on-schedule 11.0, because R had
// fallen to 0.56. If this row matches the "all Good" row instead, the elapsed
// time being fed to R is the *scheduled* interval rather than the real one.

sequence('Good, always 100 days late', [
  { outcome: 'good', s: 2.3065, d: 2.1181, interval: 2 },
  { outcome: 'good', elapsed: 100, r: 0.5589, s: 51.0584, d: 2.1112, interval: 51 },
  { outcome: 'good', elapsed: 100, r: 0.8477, s: 248.604, d: 2.1043, interval: 249 },
]);

/* ── same-day path ─────────────────────────────────────────────────────── */
// Sub-day gaps floor to 0 elapsed days, so R is 1 and §4.8 replaces the
// long-term formula. If S here explodes into the hundreds, the same-day branch
// is missing.

sequence('Good, then Again 1h later, then Good 1h later', [
  { outcome: 'good', s: 2.3065, d: 2.1181, interval: 2 },
  { outcome: 'again', elapsed: 1 / 24, r: 1.0, s: 0.7751, d: 7.3945, interval: 1 },
  { outcome: 'good', elapsed: 1 / 24, r: 1.0, s: 0.8282, d: 7.3823, interval: 1 },
]);

/* ── the rank ladder ───────────────────────────────────────────────────── */

console.log('\nrank ladder');
exact(fsrs.rankOf(null), 'new', 'rankOf(null)');
exact(fsrs.rankOf(2.3065), 'met', 'rankOf(2.31) — Good review 1');
exact(fsrs.rankOf(20.999), 'met', 'rankOf(20.999)');
exact(fsrs.rankOf(21), 'learned', 'rankOf(21) — boundary is inclusive');
exact(fsrs.rankOf(46.2802), 'learned', 'rankOf(46.28) — Good review 3');
exact(fsrs.rankOf(364.999), 'learned', 'rankOf(364.999)');
exact(fsrs.rankOf(365), 'mastered', 'rankOf(365)');
exact(fsrs.rankOf(497.4472), 'mastered', 'rankOf(497.45) — Good review 5');

console.log('\ndisplayed rank (peak high-water mark)');
// Below Learned the displayed rank tracks the real one — nothing earned yet.
exact(fsrs.displayedRank('met', 'new'), 'new', 'peak=met, now=new → new');
exact(fsrs.displayedRank('met', 'met'), 'met', 'peak=met, now=met → met');
// At Learned and above the shape is monotonic: a lapse cannot take it back.
exact(fsrs.displayedRank('learned', 'met'), 'learned', 'peak=learned, lapsed to met → learned');
exact(fsrs.displayedRank('mastered', 'met'), 'mastered', 'peak=mastered, lapsed to met → mastered');
exact(fsrs.displayedRank('mastered', 'mastered'), 'mastered', 'peak=mastered, now=mastered');
exact(fsrs.maxRank('met', 'learned'), 'learned', 'maxRank picks the higher');

/* ── report ────────────────────────────────────────────────────────────── */

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`${failures} FAILED`);
  process.exit(1);
}
console.log('FSRS-6 matches the reference.');
