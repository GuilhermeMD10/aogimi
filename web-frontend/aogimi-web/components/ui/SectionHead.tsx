// Numbered section divider used by the dictionary panels and word-detail
// breakdown views. The mono "01 / 02 / …" prefix is driven by --lgc-section-* tokens.

export function SectionHead({ num, title }: { num: string; title: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-2.5">
      <span
        className="text-[11px] font-semibold font-mono"
        style={{ color: 'var(--lgc-section-num-color)',
          letterSpacing: 'var(--lgc-section-num-tracking)', }}
      >
        {num}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lgc-accent">
        {title}
      </span>
      <span className="h-px flex-1 bg-lgc-border" />
    </div>
  );
}
