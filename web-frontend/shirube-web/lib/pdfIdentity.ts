// PDF identity + metadata + cover extraction at import time.
//
// Parallels `extractEpubData` / `computeEpubIdentity` from `lib/epubIdentity.ts`
// so PDFs participate in the same `matchBooks` priority chain (file_hash →
// content_hash → dc_identifier+title → filename). This is how the backend
// reconciles the same PDF imported on a second device after the user
// changed the title in the cloud.
//
// pdf.js is dynamic-imported inside each function so this module never
// touches browser-only globals during Next.js's server render.

export type PdfIdentity = {
  /** SHA-256 of the raw bytes — strict "same file" match. */
  fileHash: string;
  /** PDF `/ID` first entry — survives most resaves and metadata edits.
   *  Null when the PDF doesn't include an ID array. */
  contentHash: string | null;
};

export type PdfData = PdfIdentity & {
  /** Title pulled from the PDF's /Info dictionary, when present. */
  title: string | null;
  /** Data-URL JPEG of page 1, ~600px tall. Null if rendering fails. */
  coverImage: string | null;
};

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Full PDF extraction — identity + title + cover. Used at import time so
 * the imported record lands with everything we need to display *and*
 * reconcile across devices.
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
    // pdf.js may detach the buffer it's handed (`postMessage` to the worker
    // transfers it). Copy the bytes so the caller's ArrayBuffer stays
    // intact for downstream IndexedDB / hashing operations.
    doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;

    // ── Fingerprint (PDF /ID) — soft identity for matching ─────────────
    const contentHash = doc.fingerprints?.[0]?.trim() || null;

    // ── Title ──────────────────────────────────────────────────────────
    let title: string | null = null;
    try {
      const meta = await doc.getMetadata();
      const info = (meta?.info ?? null) as { Title?: string } | null;
      const t = info?.Title?.trim();
      if (t) title = t;
    } catch {
      /* metadata is optional */
    }

    // ── Cover from page 1 ──────────────────────────────────────────────
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

    return { fileHash, contentHash, title, coverImage };
  } finally {
    try { await doc?.destroy(); } catch { /* noop */ }
  }
}

/**
 * Cheap identity-only probe. Used by the locate-missing-file flow which
 * only needs to know "is this the right book" and doesn't care about title
 * or cover.
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
    // pdf.js may detach the buffer it's handed (`postMessage` to the worker
    // transfers it). Copy the bytes so the caller's ArrayBuffer stays
    // intact for downstream IndexedDB / hashing operations.
    doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
    const contentHash = doc.fingerprints?.[0]?.trim() || null;
    return { fileHash, contentHash };
  } catch {
    return { fileHash, contentHash: null };
  } finally {
    try { await doc?.destroy(); } catch { /* noop */ }
  }
}
