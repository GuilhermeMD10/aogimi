// Aogimi app-icon build.
//
// One command regenerates every launcher/favicon asset in the repo:
//
//   node aogimi-brand-assets/build-icons.mjs
//
// ── The ground is the app's sky, not a flat colour ──────────────────────────
// The icon sits on the same Midnight gradient the app paints as `--page-base`.
// The stops below mirror `--sky-1/2/3` and the violet glow in
// `web-frontend/aogimi-web/styles/ds-tokens.css`; the vermilion and gold come
// from `NIGHT.accent` / `NIGHT.gold` in
// `web-frontend/aogimi-web/features/sky/stage/lib/nightChrome.ts`, where the
// accent is documented as "the logo tile's vermilion". If the palette moves
// there, mirror it here — these are duplicated deliberately (this script cannot
// read CSS) and that is the one place they can drift.
//
// ── Framings ───────────────────────────────────────────────────────────────
//   rounded    sky + card, clipped to a rounded tile. The general-purpose icon.
//   square     same, full-bleed square with no alpha — App Store and any slot
//              that masks for itself (apple-touch, mstile).
//   contained  card pulled inside the middle 66% — Android adaptive and PWA
//              `maskable`, both of which crop the edges.
//   star       sky + the gold star alone, no card. Below ~64px the card, bow,
//              eyes and keyline all collapse into mush; the star survives.
//
// `sharp` is borrowed from the web app, the only workspace that ships it.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const WEB = path.join(REPO, 'web-frontend/aogimi-web');

const require = createRequire(path.join(WEB, 'node_modules', 'x.js'));
const sharp = require('sharp');

// ── palette ────────────────────────────────────────────────────────────────
const C = {
  sky1: '#16223c', // --sky-1  skyTop
  sky2: '#0d1526', // --sky-2  skyMid (10% stop)
  sky3: '#080514', // --sky-3  skyBase, a shade violet rather than pure black
  glow: '19, 10, 51', // the violet cast over the ramp, .69 → 0
  card: '#C3C8EA', // ema plaque + seigaiha cloud
  gold: '#E0B54B', // inset keyline
  red: '#C2452C', // NIGHT.accent — the logo tile's vermilion
  cream: '#F7E9E2', // eye highlight
  star: '#FFE085', // NIGHT.gold
  pink: '#FF5CA8',
  purple: '#7A6BE8',
  line: '#FFFFFF', // seigaiha arcs, on the card
};

// iOS-style corner radius, as a fraction of the tile edge.
const CORNER = 0.2237;

// ── primitives ─────────────────────────────────────────────────────────────

// Four-point sparkle. `pinch` pulls the edge control points toward the centre,
// so a small value gives needle-sharp points.
function sparkle(cx, cy, rx, ry, pinch = 0.14) {
  const k = Math.min(rx, ry) * pinch;
  return (
    `M ${cx} ${cy - ry}` +
    ` Q ${cx + k} ${cy - k} ${cx + rx} ${cy}` +
    ` Q ${cx + k} ${cy + k} ${cx} ${cy + ry}` +
    ` Q ${cx - k} ${cy + k} ${cx - rx} ${cy}` +
    ` Q ${cx - k} ${cy - k} ${cx} ${cy - ry} Z`
  );
}

// Corners rounded by stroking the polygon in its own fill colour with a round
// linejoin, rather than hand-authoring an arc at every vertex.
function roundedPoly(points, fill, radius) {
  const d = `M ${points.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`;
  return `<path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="${radius * 2}" stroke-linejoin="round" />`;
}

// Seigaiha cloud. Each fan is opaque — a filled disc carrying its own arcs —
// and rows are emitted top-down so each row clips the bottom of the one behind
// it, leaving the classic crescent of rings. Stroke-only rings would all stay
// visible and collapse into lace.
function seigaiha({ x0, x1, yTop, yBottom, r }) {
  const cy = yTop + r;
  const h = (r * Math.sqrt(3)) / 2; // centre → intersection with its neighbour

  let edge = `M ${x0 - r / 2} ${cy - h}`;
  let lastX = x0 - r / 2;
  for (let cx = x0; cx <= x1; cx += r) {
    lastX = cx + r / 2;
    edge += ` A ${r} ${r} 0 0 1 ${lastX} ${cy - h}`;
  }
  const slab = `${edge} L ${lastX} ${yBottom} L ${x0 - r / 2} ${yBottom} Z`;

  const sw = (r * 0.085).toFixed(2);
  const fan = (cx, ry) =>
    `<g><circle cx="${cx}" cy="${ry}" r="${r}" fill="${C.card}" stroke="${C.line}" stroke-width="${sw}" />` +
    [0.74, 0.5, 0.26]
      .map((f) => `<circle cx="${cx}" cy="${ry}" r="${(r * f).toFixed(2)}" fill="none" stroke="${C.line}" stroke-width="${sw}" />`)
      .join('') +
    `</g>`;

  const fans = [];
  const vStep = r * 0.62;
  let row = 0;
  for (let ry = cy; ry - r < yBottom; ry += vStep, row++) {
    const offset = row % 2 ? r / 2 : 0;
    for (let cx = x0 + offset - r; cx <= x1 + r; cx += r) fans.push(fan(cx, ry));
  }

  const id = `cloud${Math.round(x0)}${Math.round(r)}`;
  return (
    `<clipPath id="${id}"><path d="${slab}" /></clipPath>` +
    `<g clip-path="url(#${id})"><path d="${slab}" fill="${C.card}" />${fans.join('')}</g>`
  );
}

// ── the card ───────────────────────────────────────────────────────────────
//
// `bleed: true` runs the card and cloud past y=1024 so they leave the frame.
// `bleed: false` closes both off inside the canvas for the cropped framings.
function card({ bleed }) {
  const cardBottom = bleed ? 1120 : 1000;
  const goldBottom = bleed ? 1120 : 966;

  const plaque = roundedPoly(
    [
      [292, 524],
      [512, 524],
      [600, 608],
      [600, cardBottom],
      [232, cardBottom],
      [232, 600],
    ],
    C.card,
    22,
  );

  // Traced bottom-left → bottom-right so the open (bleeding) form still draws
  // both shoulders; closing it with Z would jump the gap instead.
  const goldPts = [
    [266, goldBottom],
    [266, 624],
    [302, 566],
    [498, 566],
    [566, 630],
    [566, goldBottom],
  ];
  const gold =
    `<path d="M ${goldPts.map(([x, y]) => `${x} ${y}`).join(' L ')}"` +
    ` fill="none" stroke="${C.gold}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round" />`;

  // Over the card, not behind it — the card rises out of the cloud. The band
  // runs past both edges: against the sky, a cloud that stops mid-tile reads as
  // a clipping bug rather than a design choice.
  const cloud = bleed
    ? seigaiha({ x0: -80, x1: 1120, yTop: 858, yBottom: 1120, r: 72 })
    : seigaiha({ x0: 150, x1: 620, yTop: 866, yBottom: 1010, r: 56 });

  const bow =
    `<g stroke="${C.red}" fill="none" stroke-linecap="round">` +
    `<ellipse cx="342" cy="505" rx="54" ry="36" stroke-width="26" transform="rotate(-24 342 505)" />` +
    `<ellipse cx="466" cy="500" rx="54" ry="36" stroke-width="26" transform="rotate(24 466 500)" />` +
    `<path d="M 402 536 L 382 616" stroke-width="19" />` +
    `<path d="M 402 536 L 440 608" stroke-width="19" />` +
    `</g>` +
    `<circle cx="403" cy="524" r="19" fill="${C.red}" />`;

  const eye = (cx, cy) =>
    `<circle cx="${cx}" cy="${cy}" r="35" fill="${C.red}" />` +
    `<circle cx="${cx - 13}" cy="${cy - 14}" r="11" fill="${C.cream}" />`;

  const sparkles =
    `<path d="${sparkle(755, 205, 58, 100)}" fill="${C.star}" />` +
    `<path d="${sparkle(560, 378, 23, 40)}" fill="${C.pink}" />` +
    `<circle cx="678" cy="312" r="12" fill="${C.pink}" />` +
    `<circle cx="300" cy="443" r="12" fill="${C.pink}" />` +
    `<circle cx="641" cy="510" r="13" fill="${C.purple}" />` +
    `<circle cx="750" cy="600" r="11" fill="${C.purple}" />`;

  return plaque + gold + cloud + bow + eye(326, 716) + eye(474, 730) + sparkles;
}

// ── sky ────────────────────────────────────────────────────────────────────
//
// The vertical ramp plus the violet glow, matching `--page-base` under
// `html[data-theme="dark"]`. CSS's `radial-gradient(80% 100% at 50% 50%)` gives
// radii of 80% of the width and 100% of the height, so the SVG circle takes the
// horizontal radius and gradientTransform stretches it vertically to match.
const SKY_DEFS =
  `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0%" stop-color="${C.sky1}" />` +
  `<stop offset="10%" stop-color="${C.sky2}" />` +
  `<stop offset="100%" stop-color="${C.sky3}" />` +
  `</linearGradient>` +
  `<radialGradient id="glow" gradientUnits="userSpaceOnUse" cx="512" cy="512" r="819"` +
  ` gradientTransform="matrix(1 0 0 1.25 0 -128)">` +
  `<stop offset="0%" stop-color="rgb(${C.glow})" stop-opacity="0.69" />` +
  `<stop offset="100%" stop-color="rgb(${C.glow})" stop-opacity="0" />` +
  `</radialGradient>`;

const SKY_FILL =
  `<rect x="-512" y="-512" width="2048" height="2048" fill="url(#sky)" />` +
  `<rect x="-512" y="-512" width="2048" height="2048" fill="url(#glow)" />`;

// ── assembly ───────────────────────────────────────────────────────────────

function svg({ body, sky = true, corner = false, width = 1024, height = 1024 }) {
  const clip = corner
    ? `<clipPath id="tile"><rect x="0" y="0" width="1024" height="1024" rx="${(1024 * CORNER).toFixed(1)}" /></clipPath>`
    : '';
  const open = corner ? `<g clip-path="url(#tile)">` : '';
  const close = corner ? `</g>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${width}" height="${height}">` +
    `<defs>${SKY_DEFS}${clip}</defs>` +
    open +
    (sky ? SKY_FILL : '') +
    body +
    close +
    `</svg>`
  );
}

// Ink extents of `card({bleed:false})`: the cloud's left lip and the plaque's
// closed bottom on one axis, the big star's tip and top on the other.
const B = { x0: 120, y0: 105, x1: 813, y1: 1010 };
const CONTAINED = (() => {
  const w = B.x1 - B.x0;
  const h = B.y1 - B.y0;
  const s = 660 / Math.max(w, h);
  const tx = 512 - s * (B.x0 + w / 2);
  const ty = 512 - s * (B.y0 + h / 2);
  return `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(5)})">${card({ bleed: false })}</g>`;
})();

// Sky + the gold star alone. Centred and scaled up, since it is carrying the
// whole identity at favicon sizes.
const STAR_ONLY = `<path d="${sparkle(512, 512, 205, 340)}" fill="${C.star}" />`;

const SOURCES = {
  'app-icon.svg': svg({ body: card({ bleed: true }), corner: true }),
  'app-icon-square.svg': svg({ body: card({ bleed: true }) }),
  'app-icon-contained.svg': svg({ body: CONTAINED }),
  'app-icon-foreground.svg': svg({ body: CONTAINED, sky: false }),
  'app-icon-background.svg': svg({ body: '' }),
  'favicon.svg': svg({ body: STAR_ONLY }),
};

// ── render targets ─────────────────────────────────────────────────────────
//
// `opaque` flattens onto the sky base: iOS rejects icons with an alpha channel,
// and the slots that mask for themselves want a filled square.
// `round` circle-masks, matching what `expo prebuild` emits.
const TARGETS = [
  // web — Next file conventions
  { src: 'app-icon.svg', out: 'web-frontend/aogimi-web/app/icon.png', size: 1024 },
  { src: 'app-icon-square.svg', out: 'web-frontend/aogimi-web/app/apple-icon.png', size: 180, opaque: true },

  // web — favicons are star-only; PWA slots get the rounded tile
  { src: 'favicon.svg', out: 'web-frontend/aogimi-web/public/favicon-16x16.png', size: 16, opaque: true },
  { src: 'favicon.svg', out: 'web-frontend/aogimi-web/public/favicon-32x32.png', size: 32, opaque: true },
  { src: 'favicon.svg', out: 'web-frontend/aogimi-web/public/favicon-48x48.png', size: 48, opaque: true },
  { src: 'favicon.svg', out: 'web-frontend/aogimi-web/public/favicon-64x64.png', size: 64, opaque: true },
  { src: 'app-icon.svg', out: 'web-frontend/aogimi-web/public/icon-192x192.png', size: 192 },
  { src: 'app-icon.svg', out: 'web-frontend/aogimi-web/public/icon-512x512.png', size: 512 },
  { src: 'app-icon-contained.svg', out: 'web-frontend/aogimi-web/public/icon-512x512-maskable.png', size: 512, opaque: true },
  { src: 'app-icon-square.svg', out: 'web-frontend/aogimi-web/public/mstile-150x150.png', size: 150, opaque: true },

  // mobile — Expo sources; `expo prebuild` regenerates the native trees from these
  { src: 'app-icon-square.svg', out: 'mobile-frontend/aogimi-mobile/assets/icon.png', size: 1024, opaque: true },
  { src: 'app-icon-foreground.svg', out: 'mobile-frontend/aogimi-mobile/assets/adaptive-icon.png', size: 1024 },
  { src: 'app-icon-background.svg', out: 'mobile-frontend/aogimi-mobile/assets/adaptive-icon-background.png', size: 1024, opaque: true },

  // iOS — alpha stripped, as the App Store requires
  {
    src: 'app-icon-square.svg',
    out: 'mobile-frontend/aogimi-mobile/ios/Aogimi/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png',
    size: 1024,
    opaque: true,
    optional: true,
  },

  // brand-asset renders, per the spec's named sizes
  { src: 'app-icon.svg', out: 'aogimi-brand-assets/app-icon/icon-1024.png', size: 1024 },
  { src: 'app-icon.svg', out: 'aogimi-brand-assets/app-icon/icon-512.png', size: 512 },
  { src: 'app-icon-square.svg', out: 'aogimi-brand-assets/app-icon/icon-1024-square.png', size: 1024, opaque: true },
  { src: 'app-icon.svg', out: 'aogimi-brand-assets/app-icon/icon-192.png', size: 192 },
  { src: 'app-icon-square.svg', out: 'aogimi-brand-assets/app-icon/icon-180.png', size: 180, opaque: true },
  { src: 'app-icon-contained.svg', out: 'aogimi-brand-assets/app-icon/icon-1024-contained.png', size: 1024, opaque: true },
  { src: 'app-icon.svg', out: 'aogimi-brand-assets/app-icon/icon-256.png', size: 256 },
  { src: 'favicon.svg', out: 'aogimi-brand-assets/favicon/favicon-64.png', size: 64, opaque: true },
  { src: 'favicon.svg', out: 'aogimi-brand-assets/favicon/favicon-32.png', size: 32, opaque: true },
  { src: 'favicon.svg', out: 'aogimi-brand-assets/favicon/favicon-16.png', size: 16, opaque: true },
];

const ANDROID_RES = 'mobile-frontend/aogimi-mobile/android/app/src/main/res';
for (const [density, launcher, foreground, splash] of [
  ['mdpi', 48, 108, 288],
  ['hdpi', 72, 162, 432],
  ['xhdpi', 96, 216, 576],
  ['xxhdpi', 144, 324, 864],
  ['xxxhdpi', 192, 432, 1152],
]) {
  TARGETS.push(
    { src: 'app-icon.svg', out: `${ANDROID_RES}/mipmap-${density}/ic_launcher.webp`, size: launcher, opaque: true, optional: true },
    { src: 'app-icon-square.svg', out: `${ANDROID_RES}/mipmap-${density}/ic_launcher_round.webp`, size: launcher, opaque: true, round: true, optional: true },
    { src: 'app-icon-foreground.svg', out: `${ANDROID_RES}/mipmap-${density}/ic_launcher_foreground.webp`, size: foreground, optional: true },
    { src: 'app-icon-foreground.svg', out: `${ANDROID_RES}/drawable-${density}/splashscreen_logo.png`, size: splash, optional: true },
  );
}

// ── run ────────────────────────────────────────────────────────────────────

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function render(t) {
  let img = sharp(Buffer.from(SOURCES[t.src]), { density: 384 }).resize(t.size, t.height ?? t.size, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (t.opaque) img = img.flatten({ background: C.sky3 });
  if (t.round) {
    const mask = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${t.size}" height="${t.size}">` +
        `<circle cx="${t.size / 2}" cy="${t.size / 2}" r="${t.size / 2}" fill="#fff" /></svg>`,
    );
    img = sharp(await img.png().toBuffer()).composite([{ input: mask, blend: 'dest-in' }]);
  }
  return (t.out.endsWith('.webp') ? img.webp({ quality: 95 }) : img.png({ compressionLevel: 9 })).toBuffer();
}

async function main() {
  for (const [name, markup] of Object.entries(SOURCES)) {
    const dest = path.join(HERE, 'app-icon', name);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, markup);
  }
  console.log(`${Object.keys(SOURCES).length} svg sources`);

  let written = 0;
  let skipped = 0;
  for (const t of TARGETS) {
    const dest = path.join(REPO, t.out);
    // Native trees are gitignored prebuild output. Refresh them in place when
    // present, so a local build picks up a new icon without a full prebuild —
    // but never create directories that prebuild owns.
    if (t.optional && !(await exists(path.dirname(dest)))) {
      skipped++;
      continue;
    }
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, await render(t));
    written++;
  }
  console.log(`${written} raster targets written, ${skipped} skipped (native tree absent)`);

  // Open-graph lockup: the rounded tile beside the wordmark. The wordmark ships
  // as ink-on-transparent, which is invisible on the sky — so it is recoloured
  // to NIGHT.ink by keeping its alpha and replacing every colour channel.
  const og = { w: 1200, h: 240 };
  const markPx = 176;
  const wordW = 520;
  const wordH = 120;
  const gap = 36;
  const startX = Math.round((og.w - (markPx + gap + wordW)) / 2);

  const markBuf = await sharp(Buffer.from(SOURCES['app-icon.svg']), { density: 384 }).resize(markPx, markPx).png().toBuffer();

  const wordSrc = sharp(path.join(HERE, 'wordmark/aogimi-wordmark-1040x240.png')).resize(wordW, wordH, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  const wordAlpha = await wordSrc.clone().ensureAlpha().extractChannel('alpha').toColourspace('b-w').toBuffer();
  const wordBuf = await sharp({ create: { width: wordW, height: wordH, channels: 3, background: '#f2f1ee' } })
    .joinChannel(wordAlpha)
    .png()
    .toBuffer();

  const skyBuf = await sharp(Buffer.from(SOURCES['app-icon-background.svg']), { density: 384 })
    .resize(og.w, og.h, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();

  await sharp(skyBuf)
    .composite([
      { input: markBuf, left: startX, top: Math.round((og.h - markPx) / 2) },
      { input: wordBuf, left: startX + markPx + gap, top: Math.round((og.h - wordH) / 2) },
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(WEB, 'app/opengraph-image.png'));
  console.log('opengraph-image.png  1200x240');
}

await main();
