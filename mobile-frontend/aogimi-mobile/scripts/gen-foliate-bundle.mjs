// Bundle foliate-js (view.js + EPUB parser + vendor zip/fflate, all transitive
// deps) into a single browser-safe IIFE, then emit it as a TypeScript constant
// the WebView template can inline. Mirrors gen-reader-libs.mjs but for the
// modern reader path.
//
//   npm run gen-foliate-bundle
//
// We only bundle what the WebView needs at runtime. foliate-js's UI helpers
// (./ui/*) and non-EPUB parsers (mobi.js, fb2.js, comic-book.js, pdf) are
// left out -- we render books from RN's side, and Aogimi is EPUB-only.

import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const foliateDir = resolve(root, 'node_modules/foliate-js');
// foliate-js's exports map doesn't expose package.json, so read it raw.
const pkgJson = JSON.parse(readFileSync(resolve(foliateDir, 'package.json'), 'utf8'));

// Single entry that pulls in everything we need. Importing view.js for its
// side-effect (registers the <foliate-view> custom element). EPUB is the only
// format we surface; if Aogimi ever adds PDF/MOBI, add them here.
// view.js side-effect-registers the <foliate-view> custom element. makeBook
// is foliate's "open any supported file" helper -- it detects EPUB vs CBZ vs
// MOBI etc. and returns a Book object that view.open() consumes. Overlayer
// exposes the static draw functions (highlight/underline/outline/...) we
// pass back from our draw-annotation listener. All surfaced on globalThis
// so the IIFE wrapper doesn't hide them.
const entryContents = `
  import './view.js';
  import { makeBook } from './view.js';
  import { Overlayer } from './overlayer.js';
  globalThis.FoliateMakeBook = makeBook;
  globalThis.FoliateOverlayer = Overlayer;
`;

// esbuild needs a real file on disk for the entry. Stash it inside the
// foliate-js package directory so its relative imports resolve naturally.
const entryPath = resolve(foliateDir, '__langecko-entry.js');
writeFileSync(entryPath, entryContents);

let bundleSrc;
try {
  const result = await build({
    entryPoints: [entryPath],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    minify: true,
    write: false,
    // Drop the entry file from any sourcemap noise.
    sourcemap: false,
    legalComments: 'none',
    // foliate-js uses `new URL('./vendor/x.js', import.meta.url)` in places
    // for worker spawning. The WebView has no module url; rewriting those is
    // out of scope. fflate is bundled inline since we only need its sync API.
    loader: { '.js': 'js' },
  });
  bundleSrc = result.outputFiles[0].text;
} finally {
  // Always clean up the temp entry so node_modules stays pristine.
  try { writeFileSync(entryPath, ''); } catch {}
}

const out =
  `// AUTO-GENERATED — do not edit by hand. Run \`npm run gen-foliate-bundle\` to refresh.\n` +
  `//\n` +
  `// Inlined foliate-js bundle for the WebView-based reader (next-gen path).\n` +
  `//   foliate-js v${pkgJson.version}\n` +
  `//   bundle size: ${bundleSrc.length.toLocaleString()} bytes (minified, browser-IIFE)\n` +
  `//\n` +
  `// At runtime, registers the <foliate-view> custom element and exposes\n` +
  `// EPUB on globalThis.FoliateEPUB. Used by foliateHtml.ts.\n\n` +
  `export const FOLIATE_SOURCE = ${JSON.stringify(bundleSrc)};\n`;

const outPath = resolve(root, 'components/reader/foliateLibs.ts');
writeFileSync(outPath, out);

console.log(
  `Wrote ${outPath}\n` +
    `  foliate-js v${pkgJson.version}  ${(bundleSrc.length / 1024).toFixed(1)} KB (minified IIFE)`,
);
