// Two-column row used by dictionary panels and word-detail kanji breakdowns.
// Label on the left (small uppercase tracking), value on the right (mono by
// default, theme display font when `jp` is true so kana / kanji render correctly).

export function InfoRow({ label, value, jp }: { label: string; value: string; jp?: boolean }) {
  return (
    <div className="flex gap-2.5">
      <span className="w-16 text-[11px] font-semibold uppercase tracking-[0.06em] text-lgc-fg-muted">
        {label}
      </span>
      <span
        className="text-[13px] text-lgc-fg"
        style={{
          fontFamily: jp ? 'var(--lgc-font-display)' : 'var(--lgc-font-mono)',
        }}
      >
        {value}
      </span>
    </div>
  );
}
