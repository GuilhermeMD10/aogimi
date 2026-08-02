import { apiSendVoid } from '@/lib/api';

/** DELETE /api/user — revokes every refresh token and cascade-deletes the
 *  account and everything under it (decks, cards, books, progress). There is
 *  no data-only wipe endpoint; deletion is the account, whole. */
export function deleteAccount(signal?: AbortSignal): Promise<void> {
  return apiSendVoid('/api/user', 'DELETE', undefined, signal);
}
