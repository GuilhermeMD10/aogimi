import type { StoredAuthUser } from '@/lib/storage/auth';

export type AuthUser = StoredAuthUser;

export interface UserProfile {
  id: number;
  username: string;
  display_name: string | null;
  email: string | null;
  language: string | null;
  avatar_index: number | null;
  onboarding_completed: boolean;
  created_at: string;
}

export interface ProfileUpdate {
  display_name?: string;
  email?: string;
  language?: string;
  avatar_index?: number;
}
