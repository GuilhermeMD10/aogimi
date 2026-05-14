import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mirrors the web client's `lgc_device_id` localStorage key — generated
// once per install, persisted forever, used to identify this device when
// the user has multiple platforms reading the same library.
const DEVICE_ID_KEY = 'lgc_device_id';
const DEVICE_NAME_KEY = 'lgc_device_name';

// RFC 4122 v4 UUID. Math.random is fine here — device IDs only need to be
// unique-per-user with high probability; they're not security tokens.
function uuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function defaultDeviceName(): string {
  if (Platform.OS === 'ios') return 'iOS device';
  if (Platform.OS === 'android') return 'Android device';
  return 'Mobile device';
}

/**
 * Returns the device id, generating + persisting one on first call.
 * Stable across app launches; cleared only by uninstalling or wiping
 * AsyncStorage.
 */
export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const fresh = uuidV4();
  await AsyncStorage.setItem(DEVICE_ID_KEY, fresh);
  return fresh;
}

/**
 * Returns the user-facing device name. Defaults to a sensible
 * platform-derived label on first call; the user can later rename it via
 * the devices admin UI (web today, mobile TBD).
 */
export async function getDeviceName(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_NAME_KEY);
  if (existing) return existing;
  const fresh = defaultDeviceName();
  await AsyncStorage.setItem(DEVICE_NAME_KEY, fresh);
  return fresh;
}

export async function setDeviceName(name: string): Promise<void> {
  await AsyncStorage.setItem(DEVICE_NAME_KEY, name);
}
