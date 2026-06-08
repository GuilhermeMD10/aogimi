import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Resolution order:
//   1. EXPO_PUBLIC_API_URL  — explicit dev override (use this for physical
//      devices: set it to your Mac's LAN IP, e.g. http://192.168.x.y:3000).
//   2. expoConfig.extra.apiUrl — overrideable from app.json/eas.json.
//   3. Platform default:
//        - Android emulator → http://10.0.2.2:3000 (special alias that
//          routes to the host's localhost; the emulator's `localhost`
//          points to itself, which is why a plain localhost URL fails).
//        - iOS sim / web / native macOS → http://localhost:3000.
function resolveApiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  const fromConfig = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (fromConfig) return fromConfig;
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

export const API_BASE = resolveApiBase();

// ── Core request helper ─────────────────────────────────────────────────────

type RequestInit = Parameters<typeof fetch>[1];

// Backend-down fail-fast threshold. When the device still has network but
// the server is unreachable, fetch waits for the OS connect/TCP timeout
// (~30–60s on Android), which freezes any awaited code path through the
// backend. 8s is short enough to feel responsive in the import flow and
// long enough to absorb a slow LAN handshake.
const REQUEST_TIMEOUT_MS = 8_000;

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Compose a timeout controller with any caller-supplied AbortSignal so
  // either source can cancel the fetch. Avoids hanging when the backend
  // refuses connections (during dev with the server down, for instance).
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
  const callerSignal = init?.signal;
  const onCallerAbort = () => timeoutController.abort();
  if (callerSignal) {
    if (callerSignal.aborted) timeoutController.abort();
    else callerSignal.addEventListener('abort', onCallerAbort);
  }
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: timeoutController.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `Request failed (${res.status})`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeoutId);
    if (callerSignal) callerSignal.removeEventListener('abort', onCallerAbort);
  }
}

