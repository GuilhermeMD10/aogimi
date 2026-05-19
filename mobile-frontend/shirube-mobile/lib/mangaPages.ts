import { Directory, File, Paths } from 'expo-file-system';
import JSZip from 'jszip';
import { bookFilePath } from './bookFiles';

export type MangaSpineEntry = {
  spineIndex: number;
  imageZipPath: string;
  cacheFilename: string;
};

/**
 * Opened-but-not-extracted handle to a manga EPUB. `zip` is null once every
 * spine entry has been cached on disk (the ZIP is no longer needed for any
 * pending extraction), which lets us skip loading the EPUB binary entirely
 * on subsequent opens of fully-read books.
 */
export type MangaSpineHandle = {
  zip: JSZip | null;
  entries: MangaSpineEntry[];
  cacheDir: Directory;
  bookId: string;
};

const CACHE_DIR = 'manga-pages';
const MANIFEST_NAME = 'manifest.json';
const MANIFEST_VERSION = 1;

// ── On-disk LRU bookkeeping ────────────────────────────────────────────────
// We persist an index at `<cache>/manga-pages/_index.json` recording each
// cached book's last-used timestamp + accumulated bytes. After every
// prepare, total cache size is summed; if over MAX_CACHE_BYTES the oldest
// book directories are deleted until under. lastUsed is bumped on prepare,
// sizeBytes is bumped on each successful page extract.
const INDEX_NAME = '_index.json';
const INDEX_VERSION = 1;
const MAX_CACHE_BYTES = 800 * 1024 * 1024; // ~800 MB

type IndexEntry = { lastUsed: number; sizeBytes: number };
type CacheIndex = {
  version: number;
  entries: Record<string, IndexEntry>;
};

// ── In-memory session cache (capacity 1) ───────────────────────────────────
// Holds the most-recently-prepared MangaSpineHandle so re-opening the same
// book in the same session skips the EPUB read + JSZip parse entirely.
// Capacity is 1 because each handle's `zip` keeps the EPUB's compressed
// bytes in heap — keeping multiple would balloon memory on big manga.
let cachedHandle: MangaSpineHandle | null = null;

/**
 * Quick check: is this EPUB a fixed-layout (manga) book? Reads only the
 * container.xml + OPF — two small XML files — and looks for the
 * `rendition:layout=pre-paginated` declaration that EPUB3 uses to mark
 * fixed-layout titles. Returns false on any parse error so corrupt /
 * non-EPUB inputs gracefully fall through to the reflowable reader.
 */
export async function isMangaEpub(filename: string): Promise<boolean> {
  // Only EPUBs can be fixed-layout manga. Skip non-epub files up front —
  // otherwise we'd read the whole file (e.g. a multi-MB PDF) into JS and
  // hand it to JSZip, which blocks the JS thread for seconds trying to
  // parse a non-zip blob before failing. That blockage froze the reader
  // chrome (chevron, dock) on every PDF open.
  if (!filename.toLowerCase().endsWith('.epub')) return false;
  try {
    const epubFile = new File(bookFilePath(filename));
    if (!epubFile.exists) return false;
    const bytes = await epubFile.bytes();
    const zip = await JSZip.loadAsync(bytes);

    const containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) return false;
    const containerXml = await containerFile.async('string');
    const opfPath = containerXml.match(/full-path="([^"]+)"/)?.[1];
    if (!opfPath) return false;

    const opfFile = zip.file(opfPath);
    if (!opfFile) return false;
    const opfXml = await opfFile.async('string');

    // EPUB3: <meta property="rendition:layout">pre-paginated</meta>
    // Older variants may put it as an attribute on <package> or <spine>.
    return /rendition:layout[^>]*>\s*pre-paginated/i.test(opfXml)
      || /rendition:layout\s*=\s*["']?pre-paginated/i.test(opfXml);
  } catch {
    return false;
  }
}

type Manifest = { version: number; entries: MangaSpineEntry[] };

function cacheRoot(): Directory {
  const root = new Directory(Paths.cache, CACHE_DIR);
  if (!root.exists) root.create({ intermediates: true });
  return root;
}

function pagesDir(bookId: string): Directory {
  const root = cacheRoot();
  const dir = new Directory(root, bookId);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

// ── Cache index I/O ────────────────────────────────────────────────────────

function indexFile(): File {
  return new File(cacheRoot(), INDEX_NAME);
}

async function readIndex(): Promise<CacheIndex> {
  const f = indexFile();
  if (!f.exists) return { version: INDEX_VERSION, entries: {} };
  try {
    const parsed = JSON.parse(await f.text()) as CacheIndex;
    if (parsed?.version === INDEX_VERSION && parsed.entries) return parsed;
  } catch {
    /* corrupt index — start over */
  }
  return { version: INDEX_VERSION, entries: {} };
}

function writeIndex(idx: CacheIndex): void {
  const f = indexFile();
  if (f.exists) f.delete();
  f.create();
  f.write(JSON.stringify(idx));
}

/**
 * Bump a book's lastUsed (and optionally add bytes). Persists immediately
 * so a crash mid-session doesn't lose the recency signal.
 */
async function touchBook(bookId: string, addBytes = 0): Promise<void> {
  const idx = await readIndex();
  const prev = idx.entries[bookId] ?? { lastUsed: 0, sizeBytes: 0 };
  idx.entries[bookId] = {
    lastUsed: Date.now(),
    sizeBytes: prev.sizeBytes + addBytes,
  };
  writeIndex(idx);
}

/**
 * If total cached bytes exceed MAX_CACHE_BYTES, delete the oldest book
 * directories (by lastUsed asc) until under. Called after prepare so
 * fresh activity doesn't itself get evicted on its first open.
 */
async function evictIfNeeded(protectedBookId?: string): Promise<void> {
  const idx = await readIndex();
  let total = 0;
  for (const e of Object.values(idx.entries)) total += e.sizeBytes;
  if (total <= MAX_CACHE_BYTES) return;

  // Sort bookIds by lastUsed ascending (oldest first), skipping the
  // currently-open book so the active reader never has its disk pulled.
  const candidates = Object.entries(idx.entries)
    .filter(([id]) => id !== protectedBookId)
    .sort((a, b) => a[1].lastUsed - b[1].lastUsed);

  for (const [id, entry] of candidates) {
    if (total <= MAX_CACHE_BYTES) break;
    deleteBookDirectory(id);
    delete idx.entries[id];
    total -= entry.sizeBytes;
  }
  writeIndex(idx);
}

function deleteBookDirectory(bookId: string): void {
  try {
    const dir = new Directory(cacheRoot(), bookId);
    if (dir.exists) dir.delete();
  } catch {
    /* swallow — best effort */
  }
}

/**
 * All bookIds with an active page-cache directory. Sourced from the
 * persisted index. Used by libraryReconcile to spot directories orphaned
 * by remote book deletes.
 */
export async function listCachedBookIds(): Promise<string[]> {
  const idx = await readIndex();
  return Object.keys(idx.entries);
}

/**
 * Drop both the on-disk page cache and the index entry for a book. Called
 * from the delete-book flow so cache space is reclaimed immediately.
 */
export async function evictBookCache(bookId: string): Promise<void> {
  deleteBookDirectory(bookId);
  const idx = await readIndex();
  if (idx.entries[bookId]) {
    delete idx.entries[bookId];
    writeIndex(idx);
  }
  // Also drop the session cache if it's holding this book.
  if (cachedHandle?.bookId === bookId) cachedHandle = null;
}

/**
 * Drop the in-memory session-cached MangaSpineHandle. Call this when a
 * reader screen unmounts AND the user is unlikely to reopen the same
 * book immediately (rare; opening a different book replaces the cache
 * automatically). Mostly an escape hatch for low-memory situations.
 */
export function releaseCachedMangaHandle(): void {
  cachedHandle = null;
}

/**
 * Open a manga EPUB for reading. Fast path: if the persisted manifest is
 * present AND every page file it references already lives in cache, we
 * skip loading the EPUB binary entirely — the on-disk cache is enough.
 * Slow path: read the EPUB (as raw bytes, not base64 — saves a 30%+
 * memory blowup), walk the spine once, persist the manifest.
 */
export async function prepareMangaSpine(
  bookId: string,
  filename: string,
): Promise<MangaSpineHandle> {
  // Session cache hit: skip the EPUB read + JSZip parse entirely. The
  // cached handle was built earlier in this session and the JSZip (if
  // present) is still alive in heap, ready to extract any pages we miss.
  if (cachedHandle?.bookId === bookId) {
    // Still bump LRU + check eviction so the on-disk cache reflects this
    // open; don't await — the rest of the read path doesn't depend on it.
    void touchBook(bookId).then(() => evictIfNeeded(bookId));
    return cachedHandle;
  }

  const cacheDir = pagesDir(bookId);
  const manifestFile = new File(cacheDir, MANIFEST_NAME);

  // Fast path: complete cache from a previous run
  if (manifestFile.exists) {
    try {
      const manifest = JSON.parse(await manifestFile.text()) as Manifest;
      if (manifest.version === MANIFEST_VERSION) {
        const allCached = manifest.entries.every((e) =>
          new File(cacheDir, e.cacheFilename).exists,
        );
        if (allCached) {
          const handle: MangaSpineHandle = {
            zip: null,
            entries: manifest.entries,
            cacheDir,
            bookId,
          };
          cachedHandle = handle;
          await touchBook(bookId);
          await evictIfNeeded(bookId);
          return handle;
        }
      }
    } catch {
      /* fall through to slow path */
    }
  }

  // Slow path: load the EPUB to extract pages on demand
  const epubFile = new File(bookFilePath(filename));
  if (!epubFile.exists) throw new Error('EPUB file missing on device');
  const bytes = await epubFile.bytes();
  const zip = await JSZip.loadAsync(bytes);

  let entries: MangaSpineEntry[];
  if (manifestFile.exists) {
    // Manifest present but cache incomplete — reuse the spine map
    const manifest = JSON.parse(await manifestFile.text()) as Manifest;
    entries = manifest.entries;
  } else {
    entries = await discoverSpineEntries(zip);
    // Persist so the next session can skip the walk
    if (manifestFile.exists) manifestFile.delete();
    manifestFile.create();
    manifestFile.write(JSON.stringify({ version: MANIFEST_VERSION, entries } satisfies Manifest));
  }

  const handle: MangaSpineHandle = { zip, entries, cacheDir, bookId };
  cachedHandle = handle;
  await touchBook(bookId);
  await evictIfNeeded(bookId);
  return handle;
}

/**
 * Materialise the page at the given spine index to a file on disk and
 * return its URI. Idempotent: returns the cached file if it exists,
 * skipping the ZIP read entirely. Image bytes flow through as Uint8Array
 * (no base64 round-trip), so each page write is one decompress + one
 * binary write.
 */
export async function extractMangaPage(
  handle: MangaSpineHandle,
  spineIndex: number,
): Promise<string> {
  const entry = handle.entries.find((e) => e.spineIndex === spineIndex);
  if (!entry) throw new Error(`Spine entry ${spineIndex} not in handle`);

  const outFile = new File(handle.cacheDir, entry.cacheFilename);
  if (outFile.exists) return outFile.uri;

  if (!handle.zip) {
    // Cache was supposed to be complete but a file is missing. Caller
    // should re-prepare; for now surface as an error.
    throw new Error(`Cache miss for spine ${spineIndex} and ZIP not loaded`);
  }
  const imgEntry = handle.zip.file(entry.imageZipPath);
  if (!imgEntry) throw new Error(`Image not in ZIP: ${entry.imageZipPath}`);

  const imgBytes = await imgEntry.async('uint8array');
  outFile.create();
  outFile.write(imgBytes);
  // Bump the LRU index's byte count so cache-eviction has accurate
  // sizes. Fire-and-forget; a missed bump just means slightly stale
  // sizeBytes until the next prepare. Skip await to keep extract latency
  // tight (it's called per-page, often in parallel during pre-fetch).
  void touchBook(handle.bookId, imgBytes.length);
  return outFile.uri;
}

// ── Spine discovery (one-time per book) ────────────────────────────────────

async function discoverSpineEntries(zip: JSZip): Promise<MangaSpineEntry[]> {
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) throw new Error('container.xml not found in EPUB');
  const containerXml = await containerFile.async('string');
  const opfMatch = containerXml.match(/full-path="([^"]+)"/);
  if (!opfMatch) throw new Error('rootfile full-path not found');
  const opfPath = opfMatch[1]!;
  const opfBase = parentPath(opfPath);

  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error(`OPF file not found: ${opfPath}`);
  const opfXml = await opfFile.async('string');

  const manifest = parseManifest(opfXml);
  const spineIdrefs = parseSpine(opfXml);

  const entries: MangaSpineEntry[] = [];
  for (let i = 0; i < spineIdrefs.length; i++) {
    const idref = spineIdrefs[i]!;
    const sectionHref = manifest[idref];
    if (!sectionHref) continue;
    const sectionPath = resolveZipPath(opfBase, sectionHref);
    const sectionFile = zip.file(sectionPath);
    if (!sectionFile) continue;
    const sectionXml = await sectionFile.async('string');
    const imgRel = findFirstImageRef(sectionXml);
    if (!imgRel) continue;
    const imageZipPath = resolveZipPath(parentPath(sectionPath), imgRel);
    if (!zip.file(imageZipPath)) continue;
    const ext = (imageZipPath.match(/\.([a-zA-Z0-9]+)$/)?.[1] || 'jpg').toLowerCase();
    entries.push({
      spineIndex: i,
      imageZipPath,
      cacheFilename: `${String(i).padStart(4, '0')}.${ext}`,
    });
  }
  return entries;
}

// ── XML helpers (regex-based; EPUB structure is well-defined) ──────────────

function parseManifest(opfXml: string): Record<string, string> {
  const items: Record<string, string> = {};
  const itemRegex = /<item\b[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(opfXml))) {
    const tag = m[0];
    const idMatch = tag.match(/\bid="([^"]+)"/);
    const hrefMatch = tag.match(/\bhref="([^"]+)"/);
    if (idMatch && hrefMatch) {
      items[idMatch[1]!] = decodeURIComponent(hrefMatch[1]!);
    }
  }
  return items;
}

function parseSpine(opfXml: string): string[] {
  const refs: string[] = [];
  const itemrefRegex = /<itemref\b[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = itemrefRegex.exec(opfXml))) {
    const tag = m[0];
    const linear = tag.match(/\blinear="([^"]+)"/)?.[1];
    if (linear === 'no') continue;
    const idref = tag.match(/\bidref="([^"]+)"/)?.[1];
    if (idref) refs.push(idref);
  }
  return refs;
}

function findFirstImageRef(sectionXml: string): string | null {
  const imgSrc = sectionXml.match(/<img\b[^>]*\bsrc="([^"]+)"/i);
  if (imgSrc) return decodeURIComponent(imgSrc[1]!);
  const xlink = sectionXml.match(/<image\b[^>]*\bxlink:href="([^"]+)"/i);
  if (xlink) return decodeURIComponent(xlink[1]!);
  const href = sectionXml.match(/<image\b[^>]*\bhref="([^"]+)"/i);
  if (href) return decodeURIComponent(href[1]!);
  return null;
}

// ── Path helpers ──────────────────────────────────────────────────────────

function parentPath(zipPath: string): string {
  const idx = zipPath.lastIndexOf('/');
  return idx === -1 ? '' : zipPath.slice(0, idx + 1);
}

function resolveZipPath(base: string, relative: string): string {
  if (relative.startsWith('/')) return relative.slice(1);
  const parts = (base + relative).split('/');
  const out: string[] = [];
  for (const p of parts) {
    if (p === '..') out.pop();
    else if (p !== '.' && p !== '') out.push(p);
  }
  return out.join('/');
}
