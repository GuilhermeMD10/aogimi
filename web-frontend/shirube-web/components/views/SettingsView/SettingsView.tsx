'use client';

import { useAuth } from '@/components/providers/AuthProvider';

// Settings view — the row list. Routing is delegated to the parent: the
// route page (`app/settings/page.tsx`) pushes /credits; the bubble passes
// an in-place handler so it can swap its inner content without closing.

export type SettingsViewProps = {
  onOpenHelp: () => void;
  onOpenCredits: () => void;
};

type NavRow = { label: string; action: 'help' | 'credits' };

const ROWS: NavRow[] = [
  { label: 'Help', action: 'help' },
  { label: 'Credits', action: 'credits' },
];

export default function SettingsView({ onOpenHelp, onOpenCredits }: SettingsViewProps) {
  const { logout } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <h1
        className="px-6 pt-6 pb-3 text-2xl font-semibold"
        style={{ color: 'var(--lgc-fg)' }}
      >
        Settings
      </h1>

      <div className="flex-1">
        {ROWS.map((row, i) => (
          <Row
            key={row.action}
            label={row.label}
            firstOfBlock={i === 0}
            onClick={() => {
              if (row.action === 'help') onOpenHelp();
              else if (row.action === 'credits') onOpenCredits();
            }}
          />
        ))}

        <Row
          label="Sign out"
          firstOfBlock={ROWS.length === 0}
          onClick={logout}
        />
      </div>
    </div>
  );
}

function Row({
  label,
  firstOfBlock,
  onClick,
}: {
  label: string;
  firstOfBlock: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left transition-opacity active:opacity-60 hover:opacity-80"
      style={{
        color: 'var(--lgc-fg)',
        padding: '16px 24px',
        borderTopWidth: firstOfBlock ? 1 : 0,
        borderBottomWidth: 1,
        borderColor: 'var(--lgc-border)',
        borderStyle: 'solid',
        fontSize: 15,
      }}
    >
      {label}
    </button>
  );
}
