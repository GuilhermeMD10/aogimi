/**
 * The motif that bleeds behind the detail pane's hero band — thin lines
 * joining points of light, the Design Language's "constellations" element.
 *
 * Purely decorative and `aria-hidden`, sized to slice from the top-right so it
 * never crosses the headword.
 *
 * The handoff has two of the stars twinkling. They don't here: the redesign's
 * standing rule is that one 120ms transition is the only motion on a page, and
 * a pulsing star would be the loudest thing on an otherwise still screen.
 * Restoring it is a `@keyframes` and one class if that reads as too quiet.
 */
export function Constellation() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 880 280"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 size-full opacity-40"
    >
      <g fill="none" stroke="var(--faint)" strokeWidth={1} opacity={0.45}>
        <path d="M560 50 L660 30 L760 70 L840 44" />
      </g>
      <g fill="var(--faint)" opacity={0.35}>
        <circle cx={600} cy={120} r={1.2} />
        <circle cx={720} cy={150} r={1} />
        <circle cx={820} cy={100} r={1.3} />
        <circle cx={690} cy={210} r={1.1} />
      </g>
      <g fill="var(--accent)">
        <circle cx={660} cy={30} r={2.4} />
        <circle cx={840} cy={44} r={2.2} />
      </g>
    </svg>
  );
}
