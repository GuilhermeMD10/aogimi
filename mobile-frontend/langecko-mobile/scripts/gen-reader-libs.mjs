// Bake the EPUB reader's runtime dependencies (jszip + epubjs) into a TypeScript
// module so the WebView can load them without network access. Re-run after
// bumping either package's version.
//
//   npm run gen-reader-libs
//
// The generated file (components/reader/epubLibs.ts) is checked in: a fresh
// clone gets a working offline reader without anyone having to remember to
// run this script first.

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const require_ = createRequire(import.meta.url);

function loadVendor(pkg, distPath) {
  const pkgJson = require_(`${pkg}/package.json`);
  const filePath = resolve(root, 'node_modules', pkg, distPath);
  const source = readFileSync(filePath, 'utf8');
  const size = statSync(filePath).size;
  return { pkg, version: pkgJson.version, source, size };
}

const jszip = loadVendor('jszip', 'dist/jszip.min.js');
const epubjs = loadVendor('epubjs', 'dist/epub.min.js');

// JSON.stringify gives us a safe, parseable JS string literal: handles every
// quoting / backslash / control-char case the minified sources can contain.
const out =
  `// AUTO-GENERATED — do not edit by hand. Run \`npm run gen-reader-libs\` to refresh.\n` +
  `//\n` +
  `// Inlined minified vendor sources for the EPUB reader WebView.\n` +
  `//   jszip  v${jszip.version}  (${jszip.size.toLocaleString()} bytes)\n` +
  `//   epubjs v${epubjs.version} (${epubjs.size.toLocaleString()} bytes)\n` +
  `//\n` +
  `// Loading these from a CDN at WebView mount time meant the reader couldn't\n` +
  `// open a book offline. Inlining the source removes that network dependency.\n\n` +
  `export const JSZIP_SOURCE = ${JSON.stringify(jszip.source)};\n\n` +
  `export const EPUBJS_SOURCE = ${JSON.stringify(epubjs.source)};\n`;

const outPath = resolve(root, 'components/reader/epubLibs.ts');
writeFileSync(outPath, out);

const totalKb = ((jszip.size + epubjs.size) / 1024).toFixed(1);
console.log(
  `Wrote ${outPath}\n` +
    `  jszip  v${jszip.version}  ${(jszip.size / 1024).toFixed(1)} KB\n` +
    `  epubjs v${epubjs.version} ${(epubjs.size / 1024).toFixed(1)} KB\n` +
    `  total                          ${totalKb} KB`,
);
