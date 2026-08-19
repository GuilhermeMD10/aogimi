import { sha256Hex, sha256HexString } from '../hash';
import { stripControl } from '../sanitize';
import { FINGERPRINT_VERSION } from '../version';
import { extractDoi, extractIsbn } from './detect';
import { detectHeadersFooters, normalize, stripLines } from './normalize';
import { dHash, samplePageIndices } from './phash';
import { extractXmpIds } from './xmp';

export type PdfIdentity = {
  /** SHA-256 of raw bytes — strict "same file" match. */
  fileHash: string;
  /** PDF `/ID[0]` from the trailer — stable across modifications.
   *  Null when the PDF doesn't include an ID array. */
  pdfIdOriginal: string | null;
  /** PDF `/ID[1]` from the trailer — changes on each save. Stored for
   *  forensics; not currently used in matching. */
  pdfIdCurrent: string | null;
  /** Total page count. */
  pageCount: number | null;
  /** True when the PDF has an extractable text layer (≥ TEXT_LAYER_MIN_CHARS
   *  total across all pages). Null when the probe failed. */
  hasTextLayer: boolean | null;
  /** /Producer from /Info. Diagnostic only — not used in matching. */
  producer: string | null;
  /** xmpMM:DocumentID — changes on export/save-as. Stored for forensics. */
  xmpDocumentId: string | null;
  /** xmpMM:OriginalDocumentID — stable across re-saves of the same source
   *  document. Strong cross-device match key. */
  xmpOriginalId: string | null;
  /** SHA-256 of normalized full text (post header/footer strip).
   *  Null when the document has no text layer or extraction failed. */
  contentHash: string | null;
  /** Per-page SHA-256 array, parallel-indexed to pages. Null when no text. */
  pageHashes: string[] | null;
  /** Character count of the normalized full text. */
  textLength: number | null;
  /** First DOI found in the front-matter (~3 pages). */
  detectedDoi: string | null;
  /** Validated ISBN-10 or ISBN-13 found in front/back matter. */
  detectedIsbn: string | null;
  /** Per-sampled-page dHash (64-bit hex). Null when rendering failed or
   *  the page count is zero. Match layer (medium confidence) pairs with
   *  `pageCount` ±10%. */
  pagePhashes: string[] | null;
  /** Version of the algorithm that produced these fields. Stored per-row
   *  on the backend so old data stays valid when the algorithm changes. */
  fingerprintVersion: number;
};

export type PdfData = PdfIdentity & {
  /** Title from the PDF's /Info dictionary, when present. */
  title: string | null;
  /** Data-URL JPEG of page 1, ~600px tall. Null if rendering fails. */
  coverImage: string | null;
};

// "Has text layer" threshold: above this many extracted chars across all
// pages, we declare the document searchable. Below it, we treat the PDF
// as scanned/image-only and skip the text-derived fingerprint fields.
const TEXT_LAYER_MIN_CHARS = 50;

// Target render width for the perceptual-hash sampling step. ~200px wide
// gives enough detail for dHash to discriminate without paying full-page
// render cost. Each sample is then downsampled to 64x64 grayscale before
// the hash itself runs.
const PHASH_RENDER_WIDTH = 200;

/**
 * Full PDF extraction — identity + metadata + text fingerprint + cover.
 * Used at import time so the imported record lands with everything we
 * need to display *and* reconcile across devices.
 *
 * Heavy: the text-extraction step costs ~15-50ms per page on modern
 * hardware. A 300-page book is in the 5-15 second range. Caller should
 * show a progress indicator; moving this into a Web Worker is the
 * obvious next step.
 */
export async function extractPdfData(buf: ArrayBuffer): Promise<PdfData> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const fileHash = await sha256Hex(buf);
  let doc: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']> | null = null;
  try {
    // pdf.js may detach the buffer it's handed (postMessage to worker
    // transfers it). Copy so the caller's ArrayBuffer stays usable downstream.
    doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;

    const pdfIdOriginal = doc.fingerprints?.[0]?.trim() || null;
    const pdfIdCurrent = doc.fingerprints?.[1]?.trim() || null;
    const pageCount = doc.numPages ?? null;

    let title: string | null = null;
    let producer: string | null = null;
    let xmpDocumentId: string | null = null;
    let xmpOriginalId: string | null = null;
    try {
      const meta = await doc.getMetadata();
      const info = (meta?.info ?? null) as { Title?: string; Producer?: string } | null;
      title = stripControl(info?.Title);
      producer = stripControl(info?.Producer);
      const xmpRaw =
        typeof (meta?.metadata as { getRaw?: () => string } | null)?.getRaw === 'function'
          ? (meta!.metadata as unknown as { getRaw: () => string }).getRaw()
          : null;
      if (xmpRaw) {
        const ids = extractXmpIds(xmpRaw);
        xmpDocumentId = ids.documentId;
        xmpOriginalId = ids.originalDocumentId;
      }
    } catch {
      /* metadata is optional */
    }

    const textFp = await computeTextFingerprint(doc);
    const pagePhashes = await computePagePhashes(doc);

    let coverImage: string | null = null;
    try {
      const page = await doc.getPage(1);
      const baseViewport = page.getViewport({ scale: 1 });
      const TARGET_HEIGHT = 600;
      const scale = TARGET_HEIGHT / baseViewport.height;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        coverImage = canvas.toDataURL('image/jpeg', 0.7);
      }
      page.cleanup();
    } catch {
      /* render failure → no cover */
    }

    return {
      fileHash,
      pdfIdOriginal,
      pdfIdCurrent,
      pageCount,
      producer,
      xmpDocumentId,
      xmpOriginalId,
      title,
      coverImage,
      pagePhashes,
      fingerprintVersion: FINGERPRINT_VERSION,
      ...textFp,
    };
  } finally {
    try { await doc?.destroy(); } catch { /* noop */ }
  }
}

/**
 * Identity + text fingerprint + perceptual hashes — no cover render. Used
 * by the locate-missing-file flow and any other path that needs the
 * matcher's full input shape but doesn't need to display the file.
 */
export async function computePdfIdentity(buf: ArrayBuffer): Promise<PdfIdentity> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const fileHash = await sha256Hex(buf);
  let doc: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']> | null = null;
  try {
    doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;

    const pdfIdOriginal = doc.fingerprints?.[0]?.trim() || null;
    const pdfIdCurrent = doc.fingerprints?.[1]?.trim() || null;
    const pageCount = doc.numPages ?? null;

    let producer: string | null = null;
    let xmpDocumentId: string | null = null;
    let xmpOriginalId: string | null = null;
    try {
      const meta = await doc.getMetadata();
      const info = (meta?.info ?? null) as { Producer?: string } | null;
      producer = stripControl(info?.Producer);
      const xmpRaw =
        typeof (meta?.metadata as { getRaw?: () => string } | null)?.getRaw === 'function'
          ? (meta!.metadata as unknown as { getRaw: () => string }).getRaw()
          : null;
      if (xmpRaw) {
        const ids = extractXmpIds(xmpRaw);
        xmpDocumentId = ids.documentId;
        xmpOriginalId = ids.originalDocumentId;
      }
    } catch {
      /* metadata is optional */
    }

    const textFp = await computeTextFingerprint(doc);
    const pagePhashes = await computePagePhashes(doc);

    return {
      fileHash,
      pdfIdOriginal,
      pdfIdCurrent,
      pageCount,
      producer,
      xmpDocumentId,
      xmpOriginalId,
      pagePhashes,
      fingerprintVersion: FINGERPRINT_VERSION,
      ...textFp,
    };
  } catch {
    return {
      fileHash,
      pdfIdOriginal: null,
      pdfIdCurrent: null,
      pageCount: null,
      hasTextLayer: null,
      producer: null,
      xmpDocumentId: null,
      xmpOriginalId: null,
      contentHash: null,
      pageHashes: null,
      textLength: null,
      detectedDoi: null,
      detectedIsbn: null,
      pagePhashes: null,
      fingerprintVersion: FINGERPRINT_VERSION,
    };
  } finally {
    try { await doc?.destroy(); } catch { /* noop */ }
  }
}

// ── Text fingerprint pipeline ───────────────────────────────────────────────

type TextFingerprint = Pick<
  PdfIdentity,
  'contentHash' | 'pageHashes' | 'textLength' | 'hasTextLayer' | 'detectedDoi' | 'detectedIsbn'
>;

async function computeTextFingerprint(
  doc: Awaited<ReturnType<typeof import('pdfjs-dist').getDocument>['promise']>,
): Promise<TextFingerprint> {
  if (!doc.numPages) return blankTextFingerprint(null);

  let rawPages: string[];
  try {
    rawPages = await extractTextPerPage(doc);
  } catch {
    return blankTextFingerprint(null);
  }

  const totalChars = rawPages.reduce((acc, p) => acc + p.length, 0);
  const hasTextLayer = totalChars >= TEXT_LAYER_MIN_CHARS;
  if (!hasTextLayer) return blankTextFingerprint(false);

  // Strip running headers / footers / page numbers (lines on > 50% of pages)
  // before hashing, so the same content under two different page-number
  // templates still produces the same content_hash.
  const headersFooters = detectHeadersFooters(rawPages);
  const cleaned = rawPages.map((p) => stripLines(p, headersFooters));

  const pageHashes = await Promise.all(
    cleaned.map(async (p) => sha256HexString(normalize(p))),
  );
  const fullText = normalize(cleaned.join('\n'));
  const contentHash = await sha256HexString(fullText);

  // DOI lives in front-matter (title page / copyright); ISBN can be either
  // front (title page) or back (copyright page / colophon).
  const front = rawPages.slice(0, 3).join('\n');
  const back = rawPages.slice(-3).join('\n');
  const detectedDoi = extractDoi(front);
  const detectedIsbn = extractIsbn(front + '\n' + back);

  return {
    contentHash,
    pageHashes,
    textLength: fullText.length,
    hasTextLayer: true,
    detectedDoi,
    detectedIsbn,
  };
}

function blankTextFingerprint(hasTextLayer: boolean | null): TextFingerprint {
  return {
    contentHash: null,
    pageHashes: null,
    textLength: hasTextLayer === false ? 0 : null,
    hasTextLayer,
    detectedDoi: null,
    detectedIsbn: null,
  };
}

async function extractTextPerPage(
  doc: Awaited<ReturnType<typeof import('pdfjs-dist').getDocument>['promise']>,
): Promise<string[]> {
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    try {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      pages.push(reconstructLines(tc.items));
      page.cleanup();
    } catch {
      pages.push('');
    }
  }
  return pages;
}

type RawTextItem = { transform?: number[]; str?: string };

/**
 * Reconstruct line-broken text from pdf.js text items by grouping by
 * y-coordinate, then sorting items left-to-right within each line and
 * lines top-to-bottom.
 *
 * Items within a line are joined with **no separator** — pdf.js often
 * includes its own whitespace in `str`, and CJK text (the primary
 * audience here) has no inter-character spaces. Inserting spaces between
 * items would mangle CJK content while only marginally helping English
 * (where the whitespace-collapse in `normalize` cleans the rest up).
 * Acceptable trade-off: deterministic and CJK-correct, occasionally
 * mashes English words together that pdf.js split into adjacent items —
 * the matcher tolerates this because both ends of the match apply the
 * same join rule.
 */
function reconstructLines(items: readonly unknown[]): string {
  type Line = { items: { x: number; str: string }[] };
  const lineMap = new Map<number, Line>();
  for (const raw of items) {
    const it = raw as RawTextItem;
    const str = it.str;
    const t = it.transform;
    if (!str || !t) continue;
    const y = Math.round(t[5] ?? 0);
    const x = t[4] ?? 0;
    let line = lineMap.get(y);
    if (!line) {
      line = { items: [] };
      lineMap.set(y, line);
    }
    line.items.push({ x, str });
  }
  // pdf.js uses a bottom-left origin, so larger y = higher on the page.
  const sortedLines = Array.from(lineMap.entries()).sort((a, b) => b[0] - a[0]);
  return sortedLines
    .map(([, line]) =>
      line.items.sort((a, b) => a.x - b.x).map((it) => it.str).join(''),
    )
    .join('\n');
}

// ── Perceptual hash pipeline ────────────────────────────────────────────────

/**
 * Render a deterministic sample of pages to grayscale 64x64 buffers and
 * compute their dHashes. Returns null when the document has no pages or
 * every render fails — both ends of the visual match layer require an
 * array with content, so a stored `null` opts the document out cleanly.
 *
 * Per-page failures (one bad page in a 6-page sample) reduce the sample
 * size but don't fail the whole batch.
 */
async function computePagePhashes(
  doc: Awaited<ReturnType<typeof import('pdfjs-dist').getDocument>['promise']>,
): Promise<string[] | null> {
  const pageCount = doc.numPages ?? 0;
  const indices = samplePageIndices(pageCount);
  if (indices.length === 0) return null;
  const hashes: string[] = [];
  for (const idx of indices) {
    const buf = await renderPageToGrayscale64(doc, idx + 1).catch(() => null);
    if (!buf) continue;
    try {
      hashes.push(dHash(buf));
    } catch {
      /* malformed buffer — skip this page */
    }
  }
  return hashes.length > 0 ? hashes : null;
}

/**
 * Render a single page to a 64x64 grayscale buffer. The intermediate
 * full-render-then-area-average pass is what gives the shared `dHash`
 * algorithm a consistent input regardless of the browser's underlying
 * canvas scaling/sampling behavior. Rec 601 grayscale weights match
 * what a future native-renderer adapter on mobile is expected to use.
 */
async function renderPageToGrayscale64(
  doc: Awaited<ReturnType<typeof import('pdfjs-dist').getDocument>['promise']>,
  pageNumber: number,
): Promise<Uint8Array | null> {
  const page = await doc.getPage(pageNumber);
  try {
    const baseViewport = page.getViewport({ scale: 1 });
    if (baseViewport.width <= 0 || baseViewport.height <= 0) return null;
    const scale = PHASH_RENDER_WIDTH / baseViewport.width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    return rgbaTo64x64Grayscale(rgba, canvas.width, canvas.height);
  } finally {
    page.cleanup();
  }
}

/**
 * Area-average an RGBA buffer to a 64x64 grayscale Uint8Array. The
 * grayscale conversion uses Rec 601 luma weights (Y = 0.299R + 0.587G
 * + 0.114B) — same coefficients the spec calls for, and what a future
 * mobile native adapter will use so hashes match.
 */
function rgbaTo64x64Grayscale(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8Array {
  const out = new Uint8Array(64 * 64);
  for (let oy = 0; oy < 64; oy++) {
    const y0 = Math.floor((oy * height) / 64);
    const y1 = Math.max(y0 + 1, Math.floor(((oy + 1) * height) / 64));
    for (let ox = 0; ox < 64; ox++) {
      const x0 = Math.floor((ox * width) / 64);
      const x1 = Math.max(x0 + 1, Math.floor(((ox + 1) * width) / 64));
      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const p = (y * width + x) * 4;
          const r = rgba[p]!;
          const g = rgba[p + 1]!;
          const b = rgba[p + 2]!;
          sum += 0.299 * r + 0.587 * g + 0.114 * b;
          count++;
        }
      }
      out[oy * 64 + ox] = count > 0 ? Math.round(sum / count) : 0;
    }
  }
  return out;
}
