// Owns the lifecycle of the bundled SQLite dictionary on mobile.
//
// First launch (or after a dictionary-version bump):
//   1. Resolve the asset (in production it's already on disk inside the
//      app bundle; in dev `Asset.fromModule` downloads from Metro).
//   2. Copy the asset file into `documentDirectory/SQLite/` where
//      `expo-sqlite` expects it. The copy is needed because bundle
//      assets are read-only and expo-sqlite needs to mmap a writable
//      handle (even for read-only queries it opens the file rw).
//   3. Write a version marker file alongside so subsequent launches
//      can detect a stale local copy.
//
// Subsequent launches:
//   - Version marker matches → skip the copy, just open.
//   - Marker missing or stale → re-copy. Stale happens when the bundled
//     dictionary is replaced in a new app release.
//
// All callers go through `getDictionary()` which returns a memoised
// handle. The first call kicks off the copy + open; concurrent callers
// share the same in-flight promise.

import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';

/**
 * Bump this whenever you rebuild the bundled `dictionary.sqlite`. On
 * launch we compare it against the version recorded in the local
 * marker file; mismatch triggers a re-copy from the bundle.
 *
 * The version is opaque — date stamps, semver, hashes, anything works
 * as long as a change here means "the bundle is newer than what's on
 * disk".
 */
const DICTIONARY_VERSION = '2026-05-24-001';

const DB_FILENAME = 'dictionary.sqlite';
const VERSION_FILENAME = 'dictionary.version';

let inFlight: Promise<SQLite.SQLiteDatabase> | null = null;
let cached: SQLite.SQLiteDatabase | null = null;

function sqliteDir(): Directory {
  // expo-sqlite's default open location is `documentDirectory/SQLite/`.
  // Create it up-front so the copy target path exists.
  const dir = new Directory(Paths.document, 'SQLite');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function dbFile(): File {
  return new File(sqliteDir(), DB_FILENAME);
}

function versionFile(): File {
  return new File(sqliteDir(), VERSION_FILENAME);
}

async function readInstalledVersion(): Promise<string | null> {
  const f = versionFile();
  if (!f.exists) return null;
  try {
    const raw = await f.text();
    return typeof raw === 'string' ? raw.trim() : null;
  } catch {
    return null;
  }
}

function writeInstalledVersion(version: string): void {
  const f = versionFile();
  if (f.exists) f.delete();
  f.create();
  f.write(version);
}

/**
 * Resolve the bundled SQLite asset to a local path. In production
 * builds this is a no-op (the file is already part of the app
 * bundle); in dev with Metro it downloads from the dev server on
 * first access and caches.
 */
async function resolveBundleAsset(): Promise<string> {
  const asset = Asset.fromModule(
    require('../../assets/dictionary.sqlite'),
  );
  await asset.downloadAsync();
  if (!asset.localUri) {
    throw new Error('Dictionary asset has no localUri after downloadAsync');
  }
  return asset.localUri;
}

/**
 * Copy the bundled `dictionary.sqlite` into the SQLite directory.
 * Overwrites any existing file at the target. Takes ~3–5 s on iOS for
 * a 250 MB file; call sites should drive a loading splash around this.
 */
async function copyFromBundle(): Promise<void> {
  const sourceUri = await resolveBundleAsset();
  const source = new File(sourceUri);
  const target = dbFile();
  if (target.exists) target.delete();
  source.copy(target);
}

/**
 * Open the dictionary, copying it from the bundle first if missing
 * or if the local version marker doesn't match. Memoised — every
 * caller after the first reuses the same handle.
 */
export async function getDictionary(): Promise<SQLite.SQLiteDatabase> {
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const installed = await readInstalledVersion();
    const needsCopy = !dbFile().exists || installed !== DICTIONARY_VERSION;
    if (needsCopy) {
      await copyFromBundle();
      writeInstalledVersion(DICTIONARY_VERSION);
    }
    const db = await SQLite.openDatabaseAsync(DB_FILENAME);
    // Performance pragmas — the file is effectively read-only, so we
    // skip the safety overhead writes don't need. WAL gives much
    // better concurrent-read latency, and `mmap_size` lets SQLite
    // memory-map the file for reads instead of going through the
    // OS read syscalls (big win for the 248 MB dictionary that gets
    // scanned by FTS / prefix queries).
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA temp_store = MEMORY;
      PRAGMA cache_size = -32000;
      PRAGMA mmap_size = 134217728;
    `);
    cached = db;
    return db;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/**
 * Returns the current copy / open state without triggering setup. UI
 * uses this to render the "preparing dictionary" splash on first
 * launch without forcing the copy from a render path.
 */
export function isDictionaryReady(): boolean {
  return cached !== null;
}
