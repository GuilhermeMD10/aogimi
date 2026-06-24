// Full-width row used in the profile actions list — leading icon, primary
// label, optional sub-label, trailing chevron. Set `danger` for destructive
// actions (sign out, delete) so the label gets the error color.

import { ChevronRight } from 'lucide-react';

export function ActionRow({
  icon: Icon,
  label,
  sub,
  danger,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  sub?: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md border border-lgc-border bg-lgc-bg-elev px-3 py-2.5 text-left transition-colors hover:bg-lgc-bg-sunken ${
        danger ? 'text-lgc-error' : 'text-lgc-fg'
      }`}
    >
      <Icon size={14} />
      <div className="flex-1">
        <div className="text-[13px] font-medium">{label}</div>
        {sub && <div className="text-[11px] text-lgc-fg-muted">{sub}</div>}
      </div>
      <ChevronRight size={13} className="text-lgc-fg-muted" />
    </button>
  );
}
