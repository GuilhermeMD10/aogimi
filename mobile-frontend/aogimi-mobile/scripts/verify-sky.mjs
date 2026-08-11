// Drift harness for `features/sky/map/lib` — the star-map engine.
//
//   npm run verify:sky
//
// `map/lib` is a **verbatim copy** of the web app's copy of the same directory.
// Its README states the property the whole feature rests on: *one seed produces
// one sky on every platform*. A user who mines a card on their phone and opens
// the web app must see that star in the same place. Nothing enforces that but
// this script — the two directories are separate files that drift the moment
// someone edits one.
//
// So this asserts two different things, and the distinction matters:
//
//   1. **Golden values** — a handful of star positions recorded from a verified
//      run, checked in below. These are the real reference. Pinning each copy
//      independently is the same discipline `verify-fsrs.mts` follows, and for
//      the same reason: two mirrors checked only against *each other* can drift
//      together and both be wrong.
//
//   2. **Cross-copy equality** — mobile's output vs the web's, when the web
//      package is present. This is the fast, high-signal check: it compares
//      every star rather than a sample. Skipped (not failed) if the sibling
//      package isn't there, so this still works on a mobile-only checkout.
//
// Plus the two invariants the lib's README warns are easy to break by accident:
// placement must never read mutable card state, and the same seed must rebuild
// the same sky.
//
// ── Why it compiles instead of importing directly ──────────────────────────
// `grid.ts` uses a TypeScript parameter property (`constructor(private readonly
// size: number)`), which Node's strip-only type support cannot handle, and the
// lib's imports are extensionless. Rather than bend app source to suit the
// runner — the source must stay byte-identical to the web's — this compiles
// both copies with `tsc` into a temp dir and requires the JavaScript.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const MOBILE_LIB = join(HERE, '..', 'features', 'sky', 'map', 'lib');
const WEB_LIB = join(
  HERE, '..', '..', '..',
  'web-frontend', 'aogimi-web', 'features', 'sky', 'map', 'lib',
);

const work = mkdtempSync(join(tmpdir(), 'verify-sky-'));
let failures = 0;
let checks = 0;

function check(ok, label, detail = '') {
  checks++;
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const TSC = join(HERE, '..', 'node_modules', '.bin', 'tsc');

function compile(srcDir, outDir) {
  // Explicit file list rather than a `*.ts` glob: a glob would need a shell to
  // expand, and `shell: true` with an args array concatenates unescaped.
  const files = readdirSync(srcDir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => join(srcDir, f));

  execFileSync(
    TSC,
    [
      ...files,
      '--module', 'commonjs', '--target', 'es2022',
      '--moduleResolution', 'node', '--skipLibCheck',
      '--outDir', outDir,
    ],
    { cwd: join(HERE, '..'), stdio: 'pipe' },
  );
  return createRequire(import.meta.url)(join(outDir, 'buildSky.js'));
}

// ── Fixture ────────────────────────────────────────────────────────────────
// Fixed in every dimension that placement reads: seed, deck ids, card keys and
// creation dates. Dates span 11 days so day-bucket constellation grouping
// actually engages rather than collapsing into one bucket.

const SEED = 'a1b2c3d4e5f60718';
const TODAY = '2026-08-07';

const mkCard = (i, d) => ({
  id: `card-${d}-${i}`,
  front: `語${d}${i}`,
  back: `meaning ${i}`,
  mastery: (i * 7 + d) % 4,
  glow: ((i * 13) % 100) / 100,
  count: i % 9,
  createdAt: new Date(Date.UTC(2026, 6, 1 + (i % 11), 9, 0, 0)).toISOString(),
});

const decksWith = (f) =>
  [0, 1, 2].map((d) => ({
    id: `deck-${d}-uuid-0000-0000`,
    name: `Deck ${d}`,
    cards: Array.from({ length: 40 }, (_, i) => f(i, d)),
  }));

const ARGS = { seed: SEED, today: TODAY, decks: decksWith(mkCard) };

const posKey = (s) => `${s.id}:${s.x.toFixed(12)},${s.y.toFixed(12)}`;
const fingerprint = (snap) => snap.stars.map(posKey).join('|');

/**
 * Recorded from a run verified bit-identical against the web copy on
 * 2026-08-07. **If a change makes these fail, that is the alarm** — a star
 * moved, and every user's sky rearranged with it. Regenerate only when the
 * move is intentional, and regenerate the web's expectations at the same time.
 */
const GOLDEN = {
  stars: 120,
  links: 87,
  constellations: 33,
};

// ── Run ────────────────────────────────────────────────────────────────────

try {
  console.log('compiling mobile copy');
  const mob = compile(MOBILE_LIB, join(work, 'mob'));

  console.log('\ngolden values');
  const a = mob.buildSky(ARGS);
  check(a.stars.length === GOLDEN.stars, `stars: ${a.stars.length}`, `want ${GOLDEN.stars}`);
  check(a.links.length === GOLDEN.links, `links: ${a.links.length}`, `want ${GOLDEN.links}`);
  check(
    a.constellations.length === GOLDEN.constellations,
    `constellations: ${a.constellations.length}`,
    `want ${GOLDEN.constellations}`,
  );

  console.log('\ndeterminism');
  check(
    JSON.stringify(mob.buildSky(ARGS).stars) === JSON.stringify(a.stars),
    'the same seed rebuilds the same sky',
  );
  check(
    JSON.stringify(mob.buildSky({ ...ARGS, seed: 'ffffffffffffffff' }).stars) !==
      JSON.stringify(a.stars),
    'a different seed produces a different sky',
  );

  // The README's first "easy to break by accident": a star's rank, brightness
  // and review count all change as the card is studied. If any of them reached
  // placement, studying a card would move it — and every star mined after it.
  const mutated = decksWith((i, d) => ({
    ...mkCard(i, d),
    mastery: 3 - ((i * 7 + d) % 4),
    glow: 1,
    count: 999,
  }));
  check(
    fingerprint(mob.buildSky({ ...ARGS, decks: mutated })) === fingerprint(a),
    'placement ignores mastery / glow / count',
  );

  console.log('\ncross-copy equality (mobile vs web)');
  if (existsSync(WEB_LIB)) {
    const web = compile(WEB_LIB, join(work, 'web'));
    const b = web.buildSky(ARGS);
    check(fingerprint(a) === fingerprint(b), 'every star position is bit-identical');
    check(JSON.stringify(a.links) === JSON.stringify(b.links), 'every link is identical');
    check(
      JSON.stringify(a.constellations) === JSON.stringify(b.constellations),
      'every constellation is identical',
    );
  } else {
    console.log('  – skipped: web package not present in this checkout');
  }

  console.log(`\n${checks - failures}/${checks} checks passed`);
  if (failures > 0) {
    console.error('Sky engine has drifted.');
    process.exit(1);
  }
  console.log('Mobile sky engine matches the reference.');
} finally {
  rmSync(work, { recursive: true, force: true });
}
