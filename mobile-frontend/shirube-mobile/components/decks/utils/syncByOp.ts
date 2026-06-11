// Shared "walk pending entries in creates→updates→deletes order, push
// each, collect pushed/failed ids" loop. Both `pushAllPendingDecks`
// and `pushAllPendingCards` previously duplicated this 3-loop pattern
// verbatim with the same accumulator shape; centralizing here keeps
// the order invariant (creates first so deck-card foreign keys can be
// rewritten before card pushes) owned in one place.

import type { PendingOp } from '../types';

export type PushOutcome = { ok: boolean };

export type SyncByOpSummary = {
  pushed: string[];
  failed: string[];
};

type WithPendingOp = { id: string; pendingOp?: PendingOp };

/**
 * Iterate `items` filtered to each `pendingOp` value in order
 * (`create` → `update` → `delete`), invoke `push` per item, and
 * collect each id into `pushed` / `failed` based on the result.
 *
 * Returns the same summary shape both deck and card sync paths
 * already produce, so callers can keep their existing types.
 */
export async function pushAllByOp<T extends WithPendingOp>(
  items: T[],
  push: (item: T) => Promise<PushOutcome>,
): Promise<SyncByOpSummary> {
  const summary: SyncByOpSummary = { pushed: [], failed: [] };
  const ops: PendingOp[] = ['create', 'update', 'delete'];
  for (const op of ops) {
    for (const item of items.filter((x) => x.pendingOp === op)) {
      const result = await push(item);
      if (result.ok) summary.pushed.push(item.id);
      else summary.failed.push(item.id);
    }
  }
  return summary;
}
