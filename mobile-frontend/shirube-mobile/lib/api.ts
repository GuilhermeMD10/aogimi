import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { DeviceRecord } from './types';

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

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
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
}

// ── Devices ─────────────────────────────────────────────────────────────────

export function registerDevice(
  userId: number,
  deviceId: string,
  name: string,
): Promise<DeviceRecord> {
  return request<DeviceRecord>('/api/devices', {
    method: 'POST',
    body: JSON.stringify({ userId, deviceId, name }),
  });
}

export function fetchUserDevices(userId: number, signal?: AbortSignal): Promise<DeviceRecord[]> {
  return request<DeviceRecord[]>(`/api/devices/user/${userId}`, { signal });
}

export function renameDevice(deviceId: string, name: string): Promise<DeviceRecord> {
  return request<DeviceRecord>(`/api/devices/${deviceId}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

export function removeDevice(deviceId: string, userId: number): Promise<{ message: string }> {
  return request<{ message: string }>(
    `/api/devices/${deviceId}?userId=${userId}`,
    { method: 'DELETE' },
  );
}
