// Switzer — the app's Latin UI face. Registered here, resolved into roles by
// `theme/tokens.ts` (`ui` / `display` / `mono`).
//
// Files live in `assets/fonts/` and are **committed**, not fetched: Switzer is
// a Fontshare (Indian Type Foundry) family under the ITF Free Font License,
// which permits redistribution in an application. Source of record and licence
// are in the web's `features/settings/lib/credits.ts` — the audited inventory
// several of our data licences require. The web self-hosts the same three cuts
// as `.woff2`, which cannot be reused here: React Native has no woff2 support
// on either platform, hence the parallel `.otf` set.
//
// ── Why this is a whole module instead of an inline require ─────────────────
// Metro resolves `require()` statically, at bundle time, from the literal
// string — a require pointing at a missing file fails the *build*, uncatchably
// (`try { require(...) } catch {}` does not help, and neither does any
// conditional around it). Keeping the requires in one file confines that risk:
// this is the one place a font is registered, and it keeps `tokens.ts` free of
// asset paths.

/**
 * Font-family name → asset, in the shape `useFonts()` takes.
 *
 * The keys are the names `tokens.ts`'s `FONT_FAMILIES.switzer` uses, so they
 * have to match it exactly — a typo here does not fail the build, it silently
 * registers a family nothing asks for.
 *
 * Three cuts, the same ones the web self-hosts (400/500/700). The zip also
 * ships a variable font and italics; neither is used — RN cannot select a
 * variable axis, so it would collapse to one weight, and nothing in the app
 * sets `fontStyle: 'italic'` on a UI role.
 */
export const switzerFonts: Record<string, number> = {
  'Switzer-Regular': require('../assets/fonts/Switzer-Regular.otf'),
  'Switzer-Medium': require('../assets/fonts/Switzer-Medium.otf'),
  'Switzer-Bold': require('../assets/fonts/Switzer-Bold.otf'),
};

/**
 * Whether the faces above are actually loadable. Kept as a derived flag rather
 * than a constant so removing a cut degrades to the system stack instead of
 * dangling a font reference.
 *
 * `tokens.ts` branches the `ui` / `display` / `mono` roles on this rather than
 * naming Switzer unconditionally. Naming a font RN has not registered is not a
 * crash, but it logs "Unrecognized font family" on every text node that uses
 * it, and on Android the fallback metrics differ enough to shift layout.
 */
export const SWITZER_AVAILABLE = Object.keys(switzerFonts).length > 0;
