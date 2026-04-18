const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// ── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: number;
  username: string;
  display_name: string | null;
  email: string | null;
  language: string | null;
  avatar_index: number | null;
  created_at: string;
}

export interface ProfileUpdate {
  display_name?: string;
  email?: string;
  language?: string;
  avatar_index?: number;
}

// ── API calls ────────────────────────────────────────────────────────────────

export async function getUserProfile(userId: number): Promise<UserProfile> {
  const res = await fetch(`${API}/api/user/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export async function updateUserProfile(
  username: string,
  password: string,
  updates: ProfileUpdate,
): Promise<UserProfile> {
  const res = await fetch(`${API}/api/user/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, updates }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to update profile');
  return res.json();
}
