// Visual badge for a book's sync state. Display-only.
// Tokens live in `styles/sync-tokens.css`.

export type SyncPillState = 'synced' | 'unsynced' | 'toImport';

const CONFIG: Record<SyncPillState, { defaultLabel: string; color: string; bg: string; border: string }> = {
  synced: {
    defaultLabel: 'SYNCED',
    color: 'var(--sync-synced)',
    bg: 'var(--sync-synced-bg)',
    border: 'var(--sync-synced-border)',
  },
  unsynced: {
    defaultLabel: 'UNSYNCED',
    color: 'var(--sync-unsynced)',
    bg: 'var(--sync-unsynced-bg)',
    border: 'var(--sync-unsynced-border)',
  },
  toImport: {
    defaultLabel: 'TO IMPORT',
    color: 'var(--sync-import)',
    bg: 'var(--sync-import-bg)',
    border: 'var(--sync-import-border)',
  },
};

export function SyncPill({
  state,
  label,
  onCover = false,
}: {
  state: SyncPillState;
  /** Override the default label text. */
  label?: string;
  /** When true, paper background instead of the tinted state colour. */
  onCover?: boolean;
}) {
  const cfg = CONFIG[state];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '5px 12px',
        borderRadius: 999,
        background: onCover ? '#FFFEFB' : cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontFamily: 'var(--lgc-font-mono)',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {label ?? cfg.defaultLabel}
    </span>
  );
}
