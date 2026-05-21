import AsyncStorage from '@react-native-async-storage/async-storage';

// Local fingerprint cache keyed by filename. Lets the import flow detect
// "the bytes about to land under this filename slot differ from what was
// here before" without re-reading the old file from disk.
//
// Web does the equivalent via its IndexedDB BookRecord; mobile has no
// per-book metadata layer (filenames + backend record are the only
// persistent identifiers), so we keep a tiny side-table here.
//
// Value shape is an object (not a bare string) so future fingerprint
// fields (xmp_original_id, pdf_id_original) can join the same lookup
// without another migration.

const KEY = 'book_fingerprints_v1';

type Fingerprint = { fileHash: string };
type FingerprintMap = Record<string, Fingerprint>;

async function readMap(): Promise<FingerprintMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as FingerprintMap) : {};
  } catch {
    return {};
  }
}

async function writeMap(map: FingerprintMap): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* quota / serialization — best-effort */
  }
}

export async function getStoredFileHash(filename: string): Promise<string | null> {
  const map = await readMap();
  return map[filename]?.fileHash ?? null;
}

export async function setStoredFileHash(filename: string, fileHash: string): Promise<void> {
  const map = await readMap();
  map[filename] = { fileHash };
  await writeMap(map);
}

export async function removeStoredFileHash(filename: string): Promise<void> {
  const map = await readMap();
  if (filename in map) {
    delete map[filename];
    await writeMap(map);
  }
}

/**
 * Drop the entire fingerprint map. Called by `wipeUserData` on account
 * switch so the next account's imports don't compare against a previous
 * user's hashes.
 */
export async function clearAllStoredFileHashes(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}
