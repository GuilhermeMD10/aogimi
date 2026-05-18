import { useEffect, useState } from 'react';
import { Directory, File, Paths } from 'expo-file-system';
import JSZip from 'jszip';
import { bookFileExists, bookFilePath } from './bookFiles';

const COVERS_DIR = 'covers';
const COVER_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const;

function coversDir(): Directory {
  const dir = new Directory(Paths.document, COVERS_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function safeName(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function existingCoverUri(filename: string): string | null {
  const safe = safeName(filename);
  for (const ext of COVER_EXTS) {
    const f = new File(coversDir(), `${safe}.${ext}`);
    if (f.exists) return f.uri;
  }
  return null;
}

// ── Cache: filename → URI | null (null = tried, no cover found) ─────────────

const memCache = new Map<string, string | null>();

// ── Library-reconcile helpers ──────────────────────────────────────────────
// Covers are stored at `covers/<safeName(filename)>.<ext>`. The reconcile
// flow either deletes one by filename or lists every safe-name on disk to
// diff against the valid book set.

/** Map a server-side filename to its safe-name key, exactly as written
 * to disk. Exported so callers can build a "valid safe-names" set when
 * reconciling without re-implementing the encoding. */
export function coverSafeNameFor(filename: string): string {
  return safeName(filename);
}

/** Remove every cover variant (any ext) belonging to this filename. */
export function deleteCoverFor(filename: string): void {
  const safe = safeName(filename);
  for (const ext of COVER_EXTS) {
    try {
      const f = new File(coversDir(), `${safe}.${ext}`);
      if (f.exists) f.delete();
    } catch {
      /* swallow — best effort */
    }
  }
  memCache.delete(filename);
}

/** All cover file basenames on disk, with the extension stripped. Returns
 * the safe-name keys, not original filenames (those are not recoverable
 * from the safe-name encoding). Caller diffs against a known safe-name
 * set built from the server's filename list. */
export function listCoverSafeNames(): string[] {
  try {
    const list = coversDir().list();
    const names: string[] = [];
    for (const entry of list) {
      if (!(entry instanceof File)) continue;
      const base = entry.uri.split('/').pop() ?? '';
      const dot = base.lastIndexOf('.');
      if (dot <= 0) continue;
      names.push(base.slice(0, dot));
    }
    return names;
  } catch {
    return [];
  }
}

/** Convenience: delete a cover by its safe-name (use this when iterating
 * `listCoverSafeNames()` results — the original filename isn't known). */
export function deleteCoverBySafeName(safe: string): void {
  for (const ext of COVER_EXTS) {
    try {
      const f = new File(coversDir(), `${safe}.${ext}`);
      if (f.exists) f.delete();
    } catch {
      /* swallow */
    }
  }
}

// ── EPUB cover discovery ────────────────────────────────────────────────────

function findRootfilePath(containerXml: string): string | null {
  const m = containerXml.match(/<rootfile[^>]+full-path=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function findCoverHref(opfXml: string): string | null {
  // EPUB 3 — manifest item with properties="cover-image"
  const epub3a = opfXml.match(
    /<item[^>]+properties=["'][^"']*cover-image[^"']*["'][^>]*href=["']([^"']+)["']/i,
  );
  if (epub3a) return epub3a[1];
  const epub3b = opfXml.match(
    /<item[^>]+href=["']([^"']+)["'][^>]+properties=["'][^"']*cover-image/i,
  );
  if (epub3b) return epub3b[1];

  // EPUB 2 — <meta name="cover" content="ID"/> → item with that id
  const meta = opfXml.match(/<meta[^>]+name=["']cover["'][^>]+content=["']([^"']+)["']/i);
  if (meta) {
    const id = meta[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const item = opfXml.match(
      new RegExp(`<item[^>]+id=["']${id}["'][^>]+href=["']([^"']+)["']`, 'i'),
    );
    if (item) return item[1];
  }

  // Fallback — first manifest item whose id contains "cover" and href is an image
  const fallback = opfXml.match(
    /<item[^>]+id=["'][^"']*cover[^"']*["'][^>]+href=["']([^"']+\.(?:jpe?g|png|webp|gif))["']/i,
  );
  if (fallback) return fallback[1];

  return null;
}

function resolveZipPath(opfPath: string, href: string): string {
  if (href.startsWith('/')) return href.slice(1);
  const slash = opfPath.lastIndexOf('/');
  const dir = slash >= 0 ? opfPath.slice(0, slash + 1) : '';
  return dir + href;
}

function extOf(href: string): string {
  const dot = href.lastIndexOf('.');
  if (dot < 0) return 'jpg';
  return href.slice(dot + 1).toLowerCase();
}

// ── Extractor ───────────────────────────────────────────────────────────────

async function extractCover(filename: string): Promise<string | null> {
  const cached = existingCoverUri(filename);
  if (cached) return cached;
  if (!bookFileExists(filename)) return null;

  const epub = new File(bookFilePath(filename));
  const bytes = await epub.bytes();
  const zip = await JSZip.loadAsync(bytes);

  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) return null;
  const containerXml = await containerFile.async('string');
  const opfPath = findRootfilePath(containerXml);
  if (!opfPath) return null;

  const opfFile = zip.file(opfPath);
  if (!opfFile) return null;
  const opfXml = await opfFile.async('string');
  const coverHref = findCoverHref(opfXml);
  if (!coverHref) return null;

  const zipPath = resolveZipPath(opfPath, coverHref);
  const coverFile = zip.file(zipPath);
  if (!coverFile) return null;

  const coverBytes = await coverFile.async('uint8array');
  const ext = extOf(coverHref);
  const target = new File(coversDir(), `${safeName(filename)}.${ext}`);
  if (target.exists) target.delete();
  target.create();
  target.write(coverBytes);
  return target.uri;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useEpubCover(filename: string | null | undefined): string | null {
  const initial =
    filename && memCache.has(filename) ? memCache.get(filename) ?? null : null;
  const [uri, setUri] = useState<string | null>(initial);

  useEffect(() => {
    if (!filename) {
      setUri(null);
      return;
    }
    if (memCache.has(filename)) {
      setUri(memCache.get(filename) ?? null);
      return;
    }
    let cancelled = false;
    extractCover(filename)
      .then((u) => {
        memCache.set(filename, u);
        if (!cancelled) setUri(u);
      })
      .catch(() => {
        memCache.set(filename, null);
        if (!cancelled) setUri(null);
      });
    return () => {
      cancelled = true;
    };
  }, [filename]);

  return uri;
}
