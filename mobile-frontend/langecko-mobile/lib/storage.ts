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
