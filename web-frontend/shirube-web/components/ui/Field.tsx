// Label / value row used inside SectionCard. Pass either `value` (string) or
// custom `children` for richer content like chips or pill groups.

export function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="grid items-center gap-4 border-t border-lgc-border py-2.5"
      style={{ gridTemplateColumns: '140px 1fr' }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide text-lgc-fg-muted">
        {label}
      </div>
      <div className="text-[13px] text-lgc-fg">{children ?? value}</div>
    </div>
  );
}
