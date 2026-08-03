import { getDb, HANDLES_STORE } from './booksDb';

// ── Typing the parts of the API TypeScript doesn't ship ──────────────────────
//
// The File System Access API is only *partly* in TypeScript's DOM lib as of 5.9.
// `FileSystemDirectoryHandle.values()` is there but lives in the
// `dom.asynciterable` lib, which is why that name is in tsconfig's `lib` array.
// The permission methods and `showDirectoryPicker` aren't declared at all — they
// were `any` casts until now.
//
// Declared here rather than in a global `.d.ts` because this file is the only
// place in the app that touches the raw API: everything else goes through the
// helpers below, so the shim and its consumers stay in one file.

/** Not in lib.dom — the spec's `FileSystemPermissionMode`. */
type FsPermissionMode = 'read' | 'readwrite';

declare global {
  interface FileSystemHandle {
    queryPermission(descriptor?: { mode?: FsPermissionMode }): Promise<PermissionState>;
    requestPermission(descriptor?: { mode?: FsPermissionMode }): Promise<PermissionState>;
  }

  interface Window {
    /** Optional on purpose: Firefox and Safari don't implement it, which is
     *  exactly what `supportsDirectoryPicker()` reports. */
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: FsPermissionMode;
      startIn?: FileSystemHandle | string;
    }) => Promise<FileSystemDirectoryHandle>;
  }
}

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
  // Read it into a local so the optional-method check narrows it for the call
  // below — this doubles as the `supportsDirectoryPicker()` guard.
  const showPicker = typeof window === 'undefined' ? undefined : window.showDirectoryPicker;
  if (!showPicker) return null;
  try {
    const handle = await showPicker.call(window, { mode: 'read' });
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

const READ = { mode: 'read' as const };

/**
 * Current read-permission state without prompting, or `null` if the API isn't
 * there to ask. Separate from `verifyPermission` because the two callers want
 * different things: the banner needs to distinguish `'prompt'` (offer to
 * reconnect) from `'denied'` (say nothing), which a boolean can't carry.
 */
export async function queryPermissionState(
  handle: FileSystemDirectoryHandle,
): Promise<PermissionState | null> {
  try {
    return await handle.queryPermission(READ);
  } catch {
    return null;
  }
}

/** Check / request read permission on a handle. Returns true if granted. */
export async function verifyPermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    if ((await handle.queryPermission(READ)) === 'granted') return true;
    if ((await handle.requestPermission(READ)) === 'granted') return true;
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
  // `values()` needs tsconfig's `dom.asynciterable` lib. The two casts below
  // stay: `FileSystemHandle` is a base interface, not a discriminated union, so
  // `kind` doesn't narrow it to the file / directory subtype on its own.
  for await (const entry of dirHandle.values()) {
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
