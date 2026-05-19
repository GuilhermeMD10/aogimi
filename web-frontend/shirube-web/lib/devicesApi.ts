import { API_URL } from './api';
import type { DeviceBookRecord, DeviceRecord } from '@/lib/types';

/** Register or heartbeat a device. */
export async function registerDevice(
  userId: number,
  deviceId: string,
  name: string,
): Promise<DeviceRecord> {
  const res = await fetch(`${API_URL}/api/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, deviceId, name }),
  });
  if (!res.ok) throw new Error('Failed to register device');
  return res.json();
}

/** List all devices for a user. */
export async function getUserDevices(userId: number, signal?: AbortSignal): Promise<DeviceRecord[]> {
  const res = await fetch(`${API_URL}/api/devices/user/${userId}`, { signal });
  if (!res.ok) throw new Error('Failed to fetch devices');
  return res.json();
}

/** Rename a device. */
export async function renameDevice(
  deviceId: string,
  userId: number,
  name: string,
): Promise<DeviceRecord> {
  const res = await fetch(`${API_URL}/api/devices/${deviceId}`, {
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
  const res = await fetch(`${API_URL}/api/devices/${deviceId}?userId=${userId}`, {
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
  const res = await fetch(`${API_URL}/api/devices/${deviceId}/books/${bookId}/available`, {
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
    `${API_URL}/api/devices/${deviceId}/books/${bookId}/available?userId=${userId}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error('Failed to remove book availability');
}

/** Get all user books with per-device availability flag. */
export async function getDeviceBooks(
  deviceId: string,
  userId: number,
): Promise<DeviceBookRecord[]> {
  const res = await fetch(`${API_URL}/api/devices/${deviceId}/books?userId=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch device books');
  return res.json();
}
