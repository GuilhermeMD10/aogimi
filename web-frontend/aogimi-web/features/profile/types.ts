export interface UserProfile {
  id: number;
  username: string;
  display_name: string | null;
  email: string | null;
  language: string | null;
  avatar_index: number | null;
  onboarding_completed: boolean;
  /** 16-hex immutable seed the star map generates from (migration 025). Optional only because a
   *  backend that predates the migration omits it — the sky simply doesn't mount then. */
  sky_seed?: string;
  created_at: string;
}

export interface ProfileUpdate {
  display_name?: string;
  email?: string;
  language?: string;
  avatar_index?: number;
}
