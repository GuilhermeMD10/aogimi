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

// Asset hash is Metro's md5 of the bundled `.sqlite` content, injected
// at build time. Every rebuild that changes the file ships a new hash;
// every rebuild that doesn't, doesn't. That means we never have to
// remember to bump a manual `DICTIONARY_VERSION` constant — the marker
// auto-invalidates the moment the asset bytes change.
//
// The hash is resolved by `resolveBundleAsset()` rather than read at
// module load time so that `Asset.fromModule` only fires when the
// dictionary is actually needed (avoids surfacing init errors at app
// boot for screens that don't touch the dictionary).

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
 * Resolve the bundled SQLite asset. Returns both the local URI (for
 * copying) and Metro's content hash (used as the version marker). In
 * production builds the URI is already on-device; in dev with Metro it
 * downloads from the dev server on first access and caches.
 */
async function resolveBundleAsset(): Promise<{ uri: string; hash: string }> {
  const asset = Asset.fromModule(
    require('../../assets/dictionary.sqlite'),
  );
  await asset.downloadAsync();
  if (!asset.localUri) {
    throw new Error('Dictionary asset has no localUri after downloadAsync');
  }
  if (!asset.hash) {
    throw new Error('Dictionary asset has no hash (bundler issue)');
  }
  return { uri: asset.localUri, hash: asset.hash };
}

/**
 * Copy the bundled `dictionary.sqlite` into the SQLite directory.
 * Overwrites any existing file at the target. Takes ~3–5 s on iOS for
 * a 250 MB file; call sites should drive a loading splash around this.
 * Returns the asset hash so the caller can stamp the version marker.
 */
async function copyFromBundle(): Promise<string> {
  const { uri, hash } = await resolveBundleAsset();
  const source = new File(uri);
  const target = dbFile();
  if (target.exists) target.delete();
  source.copy(target);
  return hash;
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
    // Resolve the asset first so we have the current bundle hash to
    // compare against the marker. This is cheap — `Asset.fromModule`
    // returns synchronously in prod (URI already on disk); the only
    // network cost is dev-mode metro asset fetch, which we'd hit on
    // the copy step anyway.
    const { hash: bundleHash } = await resolveBundleAsset();
    const installed = await readInstalledVersion();
    const needsCopy = !dbFile().exists || installed !== bundleHash;
    if (needsCopy) {
      await copyFromBundle();
      writeInstalledVersion(bundleHash);
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

