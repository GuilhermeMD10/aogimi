import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Tiny JSON wrapper around AsyncStorage. Mirrors the web version's
 * localStorage access patterns so component code reads the same on both
 * platforms.
 */
export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or serialization error — ignore */
  }
}

/**
 * Async-storage-backed JSON map, addressed by a single key. Returns the
 * pair of read/write helpers most local-state modules need (one per
 * domain: book entries, deck entries, card entries, synced-cache, etc).
 *
 * The previous pattern — four near-identical `readMap()` / `writeMap()`
 * pairs scattered across the books and decks features — drifted on
 * error handling (one swallowed all errors, another only swallowed
 * JSON.parse). Centralising removes the drift surface and makes the
 * "best-effort" contract owned in one place.
 *
 *   const store = makeAsyncJsonStore<MyMap>('feature_key');
 *   await store.read();        // returns the map or {} on any failure
 *   await store.write(map);    // best-effort persist, errors swallowed
 */
export function makeAsyncJsonStore<TMap extends Record<string, unknown>>(key: string) {
  return {
    read: async (): Promise<TMap> => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return {} as TMap;
        const parsed = JSON.parse(raw) as unknown;
        return parsed && typeof parsed === 'object' ? (parsed as TMap) : ({} as TMap);
      } catch {
        return {} as TMap;
      }
    },
    write: async (map: TMap): Promise<void> => {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(map));
      } catch {
        /* quota / serialization — best-effort */
      }
    },
  };
}
