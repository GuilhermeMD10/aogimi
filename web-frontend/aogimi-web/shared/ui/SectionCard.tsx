// Vertically-stacked profile/settings section: kicker label + optional
// subtitle + optional inline action button + free-form children.

export function SectionCard({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="mb-2.5 flex items-baseline justify-between">
        <div>
          <div className="lgc-section-label">{title}</div>
          {subtitle && <div className="mt-0.5 text-xs text-lgc-fg-muted">{subtitle}</div>}
        </div>
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="text-xs text-lgc-accent hover:underline"
          >
            {actionLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
