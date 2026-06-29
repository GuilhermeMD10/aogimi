import { getDb, HANDLES_STORE } from './booksDb';

// ── Feature detection ────────────────────────────────────────────────────────

/** Whether the File System Access API (showDirectoryPicker) is available. */
export function supportsDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

// ── Directory handle persistence (IndexedDB) ─────────────────────────────────
// The handle lives in the shared `aogimi` DB's `handles` store (see booksDb).

const DIR_KEY = 'library-dir';

/** Show the directory picker and persist the handle for later reconnection. */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!supportsDirectoryPicker()) return null;
  try {
    const handle = await (window as any).showDirectoryPicker({ mode: 'read' });
    const db = await getDb();
    await db.put(HANDLES_STORE, handle, DIR_KEY);
    return handle;
  } catch {
    // User cancelled the picker
    return null;
  }
}

/** Get the previously-persisted directory handle (if any). */
export async function getPersistedDirectory(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await getDb();
    const handle = await db.get(HANDLES_STORE, DIR_KEY);
    return handle ?? null;
  } catch {
    return null;
  }
}

/** Check / request read permission on a handle. Returns true if granted. */
export async function verifyPermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    const opts = { mode: 'read' as const };
    if ((await (handle as any).queryPermission(opts)) === 'granted') return true;
    if ((await (handle as any).requestPermission(opts)) === 'granted') return true;
    return false;
  } catch {
    return false;
  }
}

/** Remove the persisted directory handle. */
export async function clearPersistedDirectory(): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(HANDLES_STORE, DIR_KEY);
  } catch {
    // ignore
  }
}

// ── Directory scanning ───────────────────────────────────────────────────────

/** Recursively walk a directory handle and collect all book files
 *  (.epub + .pdf). */
export async function scanForBooks(
  dirHandle: FileSystemDirectoryHandle,
): Promise<File[]> {
  const files: File[] = [];
  await walkDirectory(dirHandle, files);
  return files;
}

const BOOK_EXTS = ['.epub', '.pdf'];

async function walkDirectory(
  dirHandle: FileSystemDirectoryHandle,
  results: File[],
): Promise<void> {
  for await (const entry of (dirHandle as any).values()) {
    if (entry.kind === 'file') {
      const fileHandle = entry as FileSystemFileHandle;
      const name = fileHandle.name.toLowerCase();
      if (BOOK_EXTS.some((ext) => name.endsWith(ext))) {
        try {
          const file = await fileHandle.getFile();
          results.push(file);
        } catch {
          // Skip unreadable files
        }
      }
    } else if (entry.kind === 'directory') {
      await walkDirectory(entry as FileSystemDirectoryHandle, results);
    }
  }
}

// ── Fallback: OPFS caching ──────────────────────────────────────────────────

/**
 * For browsers without showDirectoryPicker (Firefox, Safari), we cache imported
 * EPUB files in the Origin Private File System so they persist across sessions.
 */
export async function cacheFileInOpfs(name: string, data: ArrayBuffer): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
  } catch {
    // OPFS not available — silently skip
  }
}

export async function getFileFromOpfs(name: string): Promise<File | null> {
  try {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(name);
    return await fileHandle.getFile();
  } catch {
    return null;
  }
}

export async function removeFileFromOpfs(name: string): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(name);
  } catch {
    // ignore
  }
}
