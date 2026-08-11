export type UserPublic = {
  id: number;
  username: string;
};

export type UserProfile = {
  id: number;
  username: string;
  display_name: string | null;
  email: string | null;
  language: string;
  avatar_index: number;
  onboarding_completed: boolean;
  /**
   * 16 hex characters, generated server-side once per user (migration 025) and
   * **immutable** — it is not in the PATCH allow-list, deliberately.
   *
   * It is the seed the star map is generated from: same seed, same sky, on
   * every device and every launch, without storing a single star position. That
   * only holds while it never changes, which is why it isn't editable and why a
   * client must never invent one locally — a card would move between devices.
   *
   * Rides on every profile-shaped response, including register / login /
   * refresh.
   */
  sky_seed: string;
  created_at: string;
};

export type UserProfileUpdate = Partial<{
  display_name: string | null;
  email: string | null;
  language: string;
  avatar_index: number;
}>;
