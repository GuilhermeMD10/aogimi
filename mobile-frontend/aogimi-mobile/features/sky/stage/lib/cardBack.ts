import type { CardDraft } from '../types';

/**
 * Flattens a draft into the `cards.back` string.
 *
 * **The only thing in the app that knows this format.** `back` is a rendering
 * of `reading` + `meanings`, which is why `CardDraft` doesn't carry it — it is
 * derived here at the API boundary instead, so the two can't drift. Retiring
 * the column later is a change to this helper's call sites and nothing else.
 *
 * `back` is still **required** by `POST /api/decks/:id/cards`; `meanings` sits
 * beside it, not in place of it.
 *
 * ── Why this sits in `sky/stage` and not beside the draft builders ──────────
 *
 * The web keeps `cardBack` in `features/dictionary/lib/cardDraft.ts` next to
 * `wordCardDraft`, and consequently imports it *back* into `sky/stage` at its
 * view layer — so on the web `dictionary` and `sky/stage` each import from the
 * other.
 *
 * Mobile can't afford that, because here the helper is needed inside
 * `createCardLocal` — the offline queue, which is `sky/stage`'s own data layer,
 * not a view. Importing it from `dictionary` would close a genuine module
 * cycle. Putting it here instead keeps the dependency one-way
 * (`dictionary` → `sky/stage`) and costs nothing: `cardBack` renders a *card*
 * column from a *card* draft, and both of those types already live here.
 *
 * The output format is byte-identical to the web's — reading on its own line
 * when non-empty, then `1.`/`2.`/`3.` numbered glosses — so a card added from
 * either client reads the same. **That is the part that must not drift**; where
 * the function lives is a layering choice, the string it produces is a contract.
 */
export function cardBack(draft: CardDraft): string {
  const parts: string[] = [];

  if (draft.reading) parts.push(draft.reading);

  if (draft.meanings.length > 0) {
    parts.push(draft.meanings.map((m, i) => `${i + 1}. ${m}`).join('\n'));
  }

  return parts.join('\n');
}
