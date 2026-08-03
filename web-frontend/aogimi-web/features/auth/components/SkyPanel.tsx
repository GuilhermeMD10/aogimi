/**
 * The night panel beside the auth form. Decorative — nothing here is
 * interactive, and it's dropped entirely below `lg`.
 *
 * Three of the handoff's layers are here; the first one isn't. The handoff
 * fills this panel with a generated 34-star constellation (seeded PRNG,
 * rejection sampling, a Prim minimum spanning tree over the points). That's
 * deferred by the owner — for now the panel is its background plus the scrim,
 * and the constellation mounts as an absolutely-positioned child of the same
 * wrapper when it lands. `features/dictionary/components/Constellation.tsx` is
 * a hand-drawn decorative SVG, not a generator, so it isn't the thing to reuse.
 *
 * The colours are hardcoded, not tokenised. This panel is night in BOTH
 * themes — same reasoning as `shared/components/SkyBar.tsx` ("the sky is the
 * sky") and the `--cover-*` group: there is nothing for a theme to swap, so a
 * token would only add a name that always resolves to one value. Widening the
 * palette every screen reads is the more expensive mistake.
 */

// Panel base and the gold/paper inks that sit on it. From the handoff's
// non-themed sky palette.
const PANEL = '#0d1526';
const SCRIM = 'linear-gradient(180deg, rgba(8,12,24,.35) 0%, rgba(8,12,24,0) 45%, rgba(8,12,24,.75) 100%)';
const WORDMARK = '#f2f1ee';

export function SkyPanel() {
  return (
    <div aria-hidden className="relative hidden min-h-full overflow-hidden lg:block" style={{ background: PANEL }}>
      {/* Layer 2 — the scrim. Exists so the statement stays legible over the
          stars once the constellation is drawing behind it. */}
      <div className="pointer-events-none absolute inset-0" style={{ background: SCRIM }} />

      {/* Layer 3 — content. */}
      <div className="relative flex h-full min-h-full flex-col justify-between px-[52px] py-11">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-[9px] bg-(--accent) font-[family-name:var(--face-jp)] text-[20px] text-white">
            仰
          </span>
          <span className="font-[family-name:var(--face-ui)] text-[22px] font-bold" style={{ color: WORDMARK }}>
            aogimi
          </span>
        </div>
      </div>
    </div>
  );
}
