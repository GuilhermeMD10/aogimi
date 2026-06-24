// Small timestamp helpers shared inside the books feature. Lives here
// because both `useBookRecord` and `syncedBookCache` need to compare
// "which last_read_at wins" using the same semantics — duplicating the
// 2-line predicate twice meant any tweak (null handling, equality)
// risked drifting between the in-flight hydrate and the persistent
// merge.

/**
 * Returns true when ISO timestamp `a` is strictly newer than `b`.
 * `null` / `undefined` on `a` is "no timestamp" → never newer.
 * `null` / `undefined` on `b` is "no comparison anchor" → `a` wins
 * whenever it has a value.
 */
export function isNewer(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a) return false;
  if (!b) return true;
  return new Date(a).getTime() > new Date(b).getTime();
}
