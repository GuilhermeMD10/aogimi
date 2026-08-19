// Test-vector harness for `features/sky/lib/fsrs.ts`.
//
//   node scripts/verify-fsrs.mts
//
// Node ≥ 22.18 strips the types natively, so this runs with no build step and
// no test runner — which is why it is a script rather than a test file for a
// runner this package doesn't have. `.mts` so Node reads it as ESM without the
// package needing `"type": "module"`, which would change how Metro bundles.
//
// Node prints a MODULE_TYPELESS_PACKAGE_JSON warning on stderr for the
// imported `fsrs.ts` (an app source file, so it can't take an `.mts`
// extension). It is noise — the exit code is the result.
//
// The vectors are the same ones `backend/scripts/verify-fsrs.js` and the web
// app's copy of this script assert, against the same py-fsrs 6.3.1 reference.
// That duplication is the point: the three `fsrs` files are mirrors, and a
// drift between them is only caught if each is independently pinned to the
// reference. Run all three after touching any.
//
// This file is deliberately byte-identical to the web app's `verify-fsrs.mts`
// apart from this header — including the import path, which resolves the same
// from either package. If you find yourself editing the vectors here only,
// something has gone wrong.

import {
  DECAY,
  FACTOR,
  displayedRank,
  initialDifficulty,
  initialDifficultyRaw,
  maxRank,
  type Outcome,
  rankOf,
  retrievability,
  review,
} from '../features/sky/lib/fsrs.ts';

const MS_PER_DAY = 86_400_000;
const EPSILON = 1e-4;

let failures = 0;
let checks = 0;

function near(actual: number, expected: number, label: string) {
  checks++;
  if (Math.abs(actual - expected) > EPSILON) {
    failures++;
    console.error(`  ✗ ${label}: got ${actual.toFixed(6)}, want ${expected.toFixed(6)}`);
    return;
  }
  console.log(`  ✓ ${label}: ${actual.toFixed(4)}`);
}

function exact<T>(actual: T, expected: T, label: string) {
  checks++;
  if (actual !== expected) {
    failures++;
    console.error(`  ✗ ${label}: got ${actual}, want ${expected}`);
    return;
  }
  console.log(`  ✓ ${label}: ${actual}`);
}

type Step = {
  outcome: Outcome;
  /** Days since the previous review; fractional for the same-day cases. */
  elapsed?: number;
  r?: number;
  s: number;
  d: number;
  interval: number;
};

function sequence(name: string, steps: Step[]) {
  console.log(`\n${name}`);
  let prior = { stability: null as number | null, difficulty: null as number | null };
  let lastReviewedAt: Date | null = null;
  let clock = new Date('2026-01-01T09:00:00.000Z');

  steps.forEach((step, i) => {
    if (i > 0) clock = new Date(clock.getTime() + (step.elapsed ?? 0) * MS_PER_DAY);
    const out = review({ ...prior, lastReviewedAt }, step.outcome, clock);

    const tag = `#${i + 1} ${step.outcome}`;
    if (step.r != null) near(out.retrievability!, step.r, `${tag} R`);
    near(out.stability, step.s, `${tag} S`);
    near(out.difficulty, step.d, `${tag} D`);
    exact(out.intervalDays, step.interval, `${tag} interval`);

    prior = { stability: out.stability, difficulty: out.difficulty };
    lastReviewedAt = clock;
  });
}

/* ── derived constants ─────────────────────────────────────────────────── */

console.log('derived constants');
near(DECAY, -0.1542, 'DECAY');
near(FACTOR, 0.9803464944134797, 'FACTOR');
near(retrievability(2.3065, 2.3065), 0.9, 'R(S, S)');
near(retrievability(0, 5), 1.0, 'R(0, S)');
near(initialDifficultyRaw(1), 6.4133, 'D0(1)');
near(initialDifficultyRaw(2), 5.1122, 'D0(2)');
near(initialDifficultyRaw(3), 2.1181, 'D0(3)');
// D0(4) circulates as -4.7723; that constant is a transcription slip.
// `w4 - exp(w5·3) + 1` = -4.771631, and the same expression reproduces D0(1..3)
// exactly. With w7 = 0.001 the two differ by ~7e-7 in every later difficulty.
near(initialDifficultyRaw(4), -4.771631, 'D0(4) unclamped');
near(initialDifficulty(4), 1.0, 'D0(4) clamped');

/* ── the seven reference sequences ─────────────────────────────────────── */

sequence('first review · Again', [{ outcome: 'again', s: 0.212, d: 6.4133, interval: 1 }]);
sequence('first review · Hard', [{ outcome: 'hard', s: 1.2931, d: 5.1122, interval: 1 }]);
sequence('first review · Good', [{ outcome: 'good', s: 2.3065, d: 2.1181, interval: 2 }]);
sequence('first review · Easy', [{ outcome: 'easy', s: 8.2956, d: 1.0, interval: 8 }]);

sequence('all Good', [
  { outcome: 'good', s: 2.3065, d: 2.1181, interval: 2 },
  { outcome: 'good', elapsed: 2, r: 0.9095, s: 10.9643, d: 2.1112, interval: 11 },
  { outcome: 'good', elapsed: 11, r: 0.8998, s: 46.2802, d: 2.1043, interval: 46 },
  { outcome: 'good', elapsed: 46, r: 0.9004, s: 162.8622, d: 2.0975, interval: 163 },
  { outcome: 'good', elapsed: 163, r: 0.8999, s: 497.4472, d: 2.0906, interval: 497 },
  { outcome: 'good', elapsed: 497, r: 0.9001, s: 1345.5288, d: 2.0837, interval: 1346 },
]);

sequence('Good ×3 → Again → Good ×2', [
  { outcome: 'good', s: 2.3065, d: 2.1181, interval: 2 },
  { outcome: 'good', elapsed: 2, r: 0.9095, s: 10.9643, d: 2.1112, interval: 11 },
  { outcome: 'good', elapsed: 11, r: 0.8998, s: 46.2802, d: 2.1043, interval: 46 },
  { outcome: 'again', elapsed: 46, r: 0.9004, s: 2.9326, d: 7.39, interval: 3 },
  { outcome: 'good', elapsed: 3, r: 0.8984, s: 7.7782, d: 7.3778, interval: 8 },
  { outcome: 'good', elapsed: 8, r: 0.8981, s: 18.7816, d: 7.3657, interval: 19 },
]);

// Hard is a success with a penalty, not a lapse.
sequence('all Hard', [
  { outcome: 'hard', s: 1.2931, d: 5.1122, interval: 1 },
  { outcome: 'hard', elapsed: 1, r: 0.9167, s: 3.2494, d: 6.7405, interval: 3 },
  { outcome: 'hard', elapsed: 3, r: 0.9054, s: 6.7283, d: 7.8214, interval: 7 },
  { outcome: 'hard', elapsed: 7, r: 0.8973, s: 11.9164, d: 8.539, interval: 12 },
  { outcome: 'hard', elapsed: 12, r: 0.8995, s: 18.2363, d: 9.0153, interval: 18 },
]);

// Easy pins D at the floor and applies w16 every time. This ladder is what a
// mis-mapped third button produces — see the note in `ResultButtons.tsx`.
sequence('all Easy', [
  { outcome: 'easy', s: 8.2956, d: 1.0, interval: 8 },
  { outcome: 'easy', elapsed: 8, r: 0.9025, s: 65.6242, d: 1.0, interval: 66 },
  { outcome: 'easy', elapsed: 66, r: 0.8996, s: 396.775, d: 1.0, interval: 397 },
  { outcome: 'easy', elapsed: 397, r: 0.9, s: 1874.917, d: 1.0, interval: 1875 },
  { outcome: 'easy', elapsed: 1875, r: 0.9, s: 7265.4329, d: 1.0, interval: 7265 },
]);

// The spacing effect: S reaches 51.1 instead of 11.0 because R had fallen to
// 0.56. If this matches the on-schedule row, R is being fed the *scheduled*
// interval rather than the real elapsed time.
sequence('Good, always 100 days late', [
  { outcome: 'good', s: 2.3065, d: 2.1181, interval: 2 },
  { outcome: 'good', elapsed: 100, r: 0.5589, s: 51.0584, d: 2.1112, interval: 51 },
  { outcome: 'good', elapsed: 100, r: 0.8477, s: 248.604, d: 2.1043, interval: 249 },
]);

// Sub-day gaps floor to 0 elapsed days, so §4.8 replaces the long-term
// formula. If S explodes into the hundreds here, the same-day branch is gone.
sequence('Good, then Again 1h later, then Good 1h later', [
  { outcome: 'good', s: 2.3065, d: 2.1181, interval: 2 },
  { outcome: 'again', elapsed: 1 / 24, r: 1.0, s: 0.7751, d: 7.3945, interval: 1 },
  { outcome: 'good', elapsed: 1 / 24, r: 1.0, s: 0.8282, d: 7.3823, interval: 1 },
]);

/* ── the rank ladder ───────────────────────────────────────────────────── */

console.log('\nrank ladder');
exact(rankOf(null), 'new', 'rankOf(null)');
exact(rankOf(2.3065), 'met', 'rankOf(2.31) — Good review 1');
exact(rankOf(20.999), 'met', 'rankOf(20.999)');
exact(rankOf(21), 'learned', 'rankOf(21) — boundary is inclusive');
exact(rankOf(364.999), 'learned', 'rankOf(364.999)');
exact(rankOf(365), 'mastered', 'rankOf(365)');

console.log('\ndisplayed rank (peak high-water mark)');
exact(displayedRank('met', 'new'), 'new', 'peak=met, now=new → new');
exact(displayedRank('met', 'met'), 'met', 'peak=met, now=met → met');
exact(displayedRank('learned', 'met'), 'learned', 'peak=learned, lapsed to met → learned');
exact(displayedRank('mastered', 'met'), 'mastered', 'peak=mastered, lapsed to met → mastered');
exact(maxRank('met', 'learned'), 'learned', 'maxRank picks the higher');

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`${failures} FAILED`);
  process.exit(1);
}
console.log('Mobile FSRS-6 mirror matches the reference.');
