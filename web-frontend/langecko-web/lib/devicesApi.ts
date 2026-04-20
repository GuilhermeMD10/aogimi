import type { BookProgressRecord } from '@/lib/booksApi';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DeviceRecord {
  device_id: string;
  user_id: number;
  name: string;
  last_seen_at: string;
  created_at: string;
  book_count: number;
}

export interface DeviceBookRecord extends BookProgressRecord {
  available: boolean;
}

// ── API calls ───────────────────────────────────────────────────────────────

/** Register or heartbeat a device. */
export async function registerDevice(
  userId: number,
  deviceId: string,
  name: string,
): Promise<DeviceRecord> {
  const res = await fetch(`${API}/api/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, deviceId, name }),
  });
  if (!res.ok) throw new Error('Failed to register device');
  return res.json();
}

/** List all devices for a user. */
export async function getUserDevices(userId: number): Promise<DeviceRecord[]> {
  const res = await fetch(`${API}/api/devices/user/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch devices');
  return res.json();
}

/** Rename a device. */
export async function renameDevice(
  deviceId: string,
  userId: number,
  name: string,
): Promise<DeviceRecord> {
  const res = await fetch(`${API}/api/devices/${deviceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, name }),
  });
  if (!res.ok) throw new Error('Failed to rename device');
  return res.json();
}

/** Remove a device. */
export async function removeDevice(
  deviceId: string,
  userId: number,
): Promise<void> {
  const res = await fetch(`${API}/api/devices/${deviceId}?userId=${userId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to remove device');
}

/** Mark a book as available on a device. */
export async function markBookAvailable(
  deviceId: string,
  bookId: string,
  userId: number,
): Promise<void> {
  const res = await fetch(`${API}/api/devices/${deviceId}/books/${bookId}/available`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error('Failed to mark book available');
}

/** Remove book availability from a device. */
export async function removeBookAvailability(
  deviceId: string,
  bookId: string,
  userId: number,
): Promise<void> {
  const res = await fetch(
    `${API}/api/devices/${deviceId}/books/${bookId}/available?userId=${userId}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error('Failed to remove book availability');
}

/** Get all user books with per-device availability flag. */
export async function getDeviceBooks(
  deviceId: string,
  userId: number,
): Promise<DeviceBookRecord[]> {
  const res = await fetch(`${API}/api/devices/${deviceId}/books?userId=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch device books');
  return res.json();
}
