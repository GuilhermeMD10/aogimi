// Network half of the review queue (`pendingReviews.ts` is the storage
// half). Three entry points:
//
//   recordReview      — the study screen, on every grade that counted:
//                       queue first, then push at once if online.
//   cancelReview      — undo, while the grade is still only local.
//   pushAllPendingReviews — Sync-now and the reconnect auto-push, after
//                       the card create/update/delete queue has drained so
//                       every queued card id is a real backend id.
//
// Best-effort throughout. A push that never reached the server keeps its
// entry; one the server answered — accepted, not-due, duplicate, or a card
// that no longer exists — is done with, and the entry goes.

import { isOnlineNow } from '@/lib/network/network';
import { submitReview } from './studyApi';
import {
  enqueueReview,
  listPendingReviews,
  removeReview,
  type PendingReview,
} from './pendingReviews';

export type ReviewPushSummary = {
  /** Entries the server settled (applied or not) — removed from the queue. */
  pushed: string[];
  /** Entries that never reached the server — still queued. */
  failed: string[];
};

/** `request()` stamps `.status` on every HTTP failure; anything without one
 *  never reached the server. */
function httpStatus(err: unknown): number | null {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : null;
}

/**
 * Push one queued grade. `ok: true` means the queue entry is settled —
 * including the server rejecting it as malformed or for a card that is
 * gone, since retrying those can never succeed. Only "no answer" (offline,
 * timeout, 5xx) leaves the entry for next time.
 */
export async function pushOneReview(review: PendingReview): Promise<{ ok: boolean }> {
  try {
    await submitReview(review.cardId, review.outcome, {
      clientReviewId: review.clientReviewId,
      reviewedAt: review.reviewedAt,
    });
    await removeReview(review.clientReviewId);
    return { ok: true };
  } catch (err) {
    const status = httpStatus(err);
    if (status === 400 || status === 404 || status === 409) {
      await removeReview(review.clientReviewId);
      return { ok: true };
    }
    return { ok: false };
  }
}

/** Queue the grade, and send it now if the network is up. */
export async function recordReview(review: PendingReview): Promise<void> {
  await enqueueReview(review);
  if (isOnlineNow()) await pushOneReview(review);
}

/** Undo a grade that hasn't been sent. A no-op once it has — the server
 *  keeps what it was told; there is no un-review endpoint. */
export async function cancelReview(clientReviewId: string): Promise<void> {
  await removeReview(clientReviewId);
}

/** Drain the queue oldest-first, stopping at the first entry the server
 *  didn't answer — later ones would only hit the same dead network. */
export async function pushAllPendingReviews(): Promise<ReviewPushSummary> {
  const summary: ReviewPushSummary = { pushed: [], failed: [] };
  const pending = await listPendingReviews();
  for (let i = 0; i < pending.length; i++) {
    const review = pending[i]!;
    const result = await pushOneReview(review);
    if (result.ok) {
      summary.pushed.push(review.clientReviewId);
    } else {
      summary.failed.push(...pending.slice(i).map((r) => r.clientReviewId));
      break;
    }
  }
  return summary;
}
