// Drift harness for `features/sky/map/native/cameraWorklet.ts`.
//
//   npm run verify:camera
//
// The Skia renderer clamps pan and zoom on the UI thread, so the camera's clamp
// law had to be stated a second time as worklets — Reanimated cannot call an
// imported plain function from a worklet outside experimental `bundleMode`, and
// `map/lib` is the byte-identical copy of the web's that `verify:sky` forbids
// editing. `cameraWorklet.ts`'s header states the full argument.
//
// This is the guard on that duplication, and it is the same discipline the three
// FSRS copies follow: the mirror is only allowed to exist because a script
// proves it agrees.
//
// What is asserted:
//
//   1. **Exact agreement with `lib/camera.ts`** for `fitZoom`, `clampZoom`,
//      `toWorld`, `clampCamera` and `zoomAround`, over a deterministic sweep of
//      randomised poses — boxes wide and tall, viewports portrait and landscape,
//      insets symmetric and lopsided, zooms below the floor and above the
//      ceiling, and both zoom-limit regimes (`DEFAULT_LIMITS` and the focused
//      tier's adaptive pair).
//
//   2. **The degenerate cases**, listed explicitly rather than left to the
//      random sweep to stumble into: a zero-area box, a box narrower than the
//      viewport on one axis only, insets larger than the viewport, and a pose
//      already exactly on the boundary.
//
//   3. **The properties the mirror must have on its own** — a clamped pose is
//      idempotent under a second clamp, and `zoomAround` really does pin the
//      world point under the focal px.
//
// Equality is exact (`Object.is` on each component, so a `-0`/`0` split fails).
// The two copies are the same arithmetic in the same order on the same doubles,
// so anything less than exact means a real edit, not float noise.
//
// ── Why it compiles instead of importing directly ──────────────────────────
// Same reason as `verify-sky.mjs`: the lib's imports are extensionless and it
// leans on TypeScript syntax Node's strip-only support rejects. Both files are
// compiled with `tsc` into a temp dir and required as JavaScript. The `'worklet'`
// directives are plain string-expression statements, so the compiled mirror runs
// in Node untouched — which is exactly what makes it testable here at all.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

const work = mkdtempSync(join(tmpdir(), 'verify-camera-'));
let failures = 0;
let checks = 0;

function check(ok, label, detail = '') {
  checks++;
  if (ok) return;
  failures++;
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
}

function pass(label) {
  console.log(`  ✓ ${label}`);
}

/* ---------- compile both copies ---------- */

// A tiny entry that re-exports the two modules under distinct names, so one tsc
// invocation produces one requireable file with both halves on it.
const ENTRY = `
export * as lib from '../features/sky/map/lib/camera';
export * as mirror from '../features/sky/map/native/cameraWorklet';
`;

// The shim lives *inside* the package rather than in the temp dir: `--rootDir`
// has to contain every input, and the inputs are app source. Removed in the
// `finally`, so a failed compile does not leave it behind.
const shimDir = join(PKG, '.verify-camera');
const entry = join(shimDir, 'entry.ts');
try {
  execFileSync('mkdir', ['-p', shimDir]);
  writeFileSync(entry, ENTRY);
  execFileSync(
    'npx',
    [
      'tsc',
      entry,
      '--outDir', join(work, 'out'),
      '--module', 'commonjs',
      '--target', 'es2020',
      '--moduleResolution', 'node',
      '--skipLibCheck',
      '--rootDir', PKG,
    ],
    { cwd: PKG, stdio: 'pipe' },
  );
} catch (e) {
  console.error('verify:camera — could not compile the two copies');
  console.error(e.stdout?.toString() ?? e.message);
  rmSync(shimDir, { recursive: true, force: true });
  rmSync(work, { recursive: true, force: true });
  process.exit(1);
} finally {
  rmSync(shimDir, { recursive: true, force: true });
}

const require_ = createRequire(import.meta.url);
const { lib, mirror } = require_(join(work, 'out', '.verify-camera', 'entry.js'));

/* ---------- the randomised sweep ---------- */

// Deterministic PRNG (mulberry32) off a fixed seed, so a failure is reproducible
// rather than being a different sweep on every run.
let s = 0x9e3779b9;
const rnd = () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const between = (lo, hi) => lo + rnd() * (hi - lo);

function randomCase() {
  // Boxes from a single-star deck (tiny) to the 5000-card sky (a few thousand
  // world units), including near-degenerate slivers.
  const w = between(0.5, 4000);
  const h = between(0.5, 4000);
  const cx = between(-2000, 2000);
  const cy = between(-2000, 2000);
  const b = { minX: cx - w / 2, minY: cy - h / 2, maxX: cx + w / 2, maxY: cy + h / 2 };

  const vp = { width: between(1, 1400), height: between(1, 1400) };

  // A quarter of cases run with no insets at all — the lib takes `undefined`
  // there and the mirror takes `null`, and that seam is worth exercising.
  const ins =
    rnd() < 0.25
      ? null
      : {
          top: between(0, 400),
          right: between(0, 400),
          bottom: between(0, 400),
          left: between(0, 400),
        };

  // Both regimes: the flat constants, and the focused tier's adaptive pair.
  const lim = rnd() < 0.5 ? lib.DEFAULT_LIMITS : lib.focusLimits(b, vp, ins ?? undefined);

  // Zooms deliberately spread well past both limits so the clamps actually bite.
  const cam = {
    x: between(-3000, 3000),
    y: between(-3000, 3000),
    zoom: Math.exp(between(Math.log(1e-4), Math.log(50))),
  };

  const focal = { x: between(0, vp.width), y: between(0, vp.height) };
  const factor = Math.exp(between(-2, 2));

  return { b, vp, ins, lim, cam, focal, factor };
}

const same = (a, c) => Object.is(a, c);
const sameCam = (a, c) => Object.is(a.x, c.x) && Object.is(a.y, c.y) && Object.is(a.zoom, c.zoom);
const samePt = (a, c) => Object.is(a.x, c.x) && Object.is(a.y, c.y);

const show = (o) => JSON.stringify(o);

function runCase(t, i) {
  const { b, vp, ins, lim, cam, focal, factor } = t;
  const insLib = ins ?? undefined;

  const fitL = lib.fitZoom(b, vp, insLib, lim);
  const fitM = mirror.fitZoomW(b, vp, ins, lim.fit);
  check(same(fitL, fitM), `case ${i}: fitZoom`, `lib ${fitL} vs mirror ${fitM} · ${show(t)}`);

  const czL = lib.clampZoom(cam.zoom, b, vp, insLib, lim);
  const czM = mirror.clampZoomW(cam.zoom, b, vp, ins, lim.fit, lim.max);
  check(same(czL, czM), `case ${i}: clampZoom`, `lib ${czL} vs mirror ${czM} · ${show(t)}`);

  const twL = lib.toWorld(focal, cam, vp);
  const twM = mirror.toWorldW(focal, cam, vp);
  check(samePt(twL, twM), `case ${i}: toWorld`, `lib ${show(twL)} vs mirror ${show(twM)}`);

  const ccL = lib.clampCamera(cam, b, vp, insLib, lim);
  const ccM = mirror.clampCameraW(cam, b, vp, ins, lim.fit, lim.max);
  check(sameCam(ccL, ccM), `case ${i}: clampCamera`, `lib ${show(ccL)} vs mirror ${show(ccM)} · ${show(t)}`);

  const zaL = lib.zoomAround(cam, focal, factor, b, vp, insLib, lim);
  const zaM = mirror.zoomAroundW(cam, focal, factor, b, vp, ins, lim.fit, lim.max);
  check(sameCam(zaL, zaM), `case ${i}: zoomAround`, `lib ${show(zaL)} vs mirror ${show(zaM)} · ${show(t)}`);

  // Properties of the mirror in its own right.
  const twice = mirror.clampCameraW(ccM, b, vp, ins, lim.fit, lim.max);
  check(sameCam(ccM, twice), `case ${i}: clampCamera is idempotent`, `${show(ccM)} → ${show(twice)}`);

  // `panRangeW` is `clampCamera`'s position half, factored out for the fling.
  // Clamping into that range must land exactly where the full clamp does — at
  // the *clamped* zoom, which is the zoom the position half is resolved under.
  const r = mirror.panRangeW(ccM.zoom, b, vp, ins);
  const viaRange = {
    x: Math.min(r.xHi, Math.max(r.xLo, cam.x)),
    y: Math.min(r.yHi, Math.max(r.yLo, cam.y)),
    zoom: ccM.zoom,
  };
  check(
    sameCam(viaRange, ccM),
    `case ${i}: panRange agrees with clampCamera`,
    `range ${show(viaRange)} vs clamp ${show(ccM)} · ${show(t)}`,
  );

  // zoomAround pins the world point under the focal px. Only meaningful when the
  // zoom actually changed; when it didn't, the pose is returned untouched.
  if (!Object.is(zaM.zoom, cam.zoom)) {
    const before = mirror.toWorldW(focal, cam, vp);
    const after = mirror.toWorldW(focal, zaM, vp);
    const off = Math.hypot(before.x - after.x, before.y - after.y);
    // A world-unit tolerance scaled to the box: this one is float arithmetic
    // across two different zooms, not a comparison of identical expressions.
    const tol = Math.max(1e-6, (b.maxX - b.minX) * 1e-9);
    check(off <= tol, `case ${i}: zoomAround pins the focal point`, `off by ${off} (tol ${tol})`);
  }
}

console.log('verify:camera — the UI-thread clamp mirror vs lib/camera.ts\n');

console.log('randomised sweep');
const N = 4000;
for (let i = 0; i < N; i++) runCase(randomCase(), i);
if (failures === 0) pass(`${N} randomised poses agree exactly (${checks} assertions)`);

/* ---------- the degenerate cases, named ---------- */

console.log('\ndegenerate cases');
const before = failures;

const DEGENERATE = [
  {
    label: 'zero-area box',
    b: { minX: 10, minY: 10, maxX: 10, maxY: 10 },
    vp: { width: 390, height: 700 },
    ins: null,
  },
  {
    label: 'box narrower than the viewport on one axis only',
    b: { minX: -10, minY: -900, maxX: 10, maxY: 900 },
    vp: { width: 390, height: 700 },
    ins: null,
  },
  {
    label: 'insets wider than the viewport',
    b: { minX: -500, minY: -500, maxX: 500, maxY: 500 },
    vp: { width: 390, height: 700 },
    ins: { top: 500, right: 300, bottom: 500, left: 300 },
  },
  {
    label: 'lopsided insets (a panel on one side)',
    b: { minX: -500, minY: -500, maxX: 500, maxY: 500 },
    vp: { width: 1200, height: 800 },
    ins: { top: 96, right: 360, bottom: 84, left: 58 },
  },
  {
    label: 'a pose already exactly fitted',
    b: { minX: -400, minY: -300, maxX: 400, maxY: 300 },
    vp: { width: 800, height: 600 },
    ins: null,
    fitted: true,
  },
];

for (const d of DEGENERATE) {
  const lim = lib.DEFAULT_LIMITS;
  const cam = d.fitted
    ? lib.cameraFitting(d.b, d.vp, d.ins ?? undefined, lim)
    : { x: 1234, y: -987, zoom: 3.7 };
  runCase({ b: d.b, vp: d.vp, ins: d.ins, lim, cam, focal: { x: 12, y: 34 }, factor: 0.83 }, d.label);
  // and again under the focused tier's limits, which is where the fit cap bites
  const flim = lib.focusLimits(d.b, d.vp, d.ins ?? undefined);
  runCase(
    { b: d.b, vp: d.vp, ins: d.ins, lim: flim, cam, focal: { x: 12, y: 34 }, factor: 1.4 },
    `${d.label} (focused limits)`,
  );
}
if (failures === before) pass(`${DEGENERATE.length} degenerate cases agree, under both zoom regimes`);

/* ---------- done ---------- */

rmSync(work, { recursive: true, force: true });

console.log();
if (failures > 0) {
  console.error(`verify:camera FAILED — ${failures} of ${checks} assertions`);
  console.error('The UI-thread mirror and lib/camera.ts have drifted. Change one, change both.');
  process.exit(1);
}
console.log(`verify:camera OK — ${checks} assertions`);
