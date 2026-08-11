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
  created_at: string;
};

export type UserProfileUpdate = Partial<{
  display_name: string | null;
  email: string | null;
  language: string;
  avatar_index: number;
}>;
