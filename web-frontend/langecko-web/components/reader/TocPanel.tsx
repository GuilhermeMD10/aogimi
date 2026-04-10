'use client';

export type NavItem = {
  label: string;
  href: string;
  subitems?: NavItem[];
};

type Props = {
  items: NavItem[];
  onNavigate: (href: string) => void;
  onClose: () => void;
};

function NavList({
  items,
  onNavigate,
  depth = 0,
}: {
  items: NavItem[];
  onNavigate: (href: string) => void;
  depth?: number;
}) {
  return (
    <ul>
      {items.map((item) => (
        <li key={`${item.href}-${item.label}`}>
          <button
            type="button"
            onClick={() => onNavigate(item.href)}
            style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
            className="w-full truncate py-1 pr-3 text-left text-xs text-lumina-primary-text hover:bg-black/5"
          >
            {item.label}
          </button>
          {item.subitems?.length ? (
            <NavList items={item.subitems} onNavigate={onNavigate} depth={depth + 1} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function TocPanel({ items, onNavigate, onClose }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-lumina-border-divider px-3 py-1.5">
        <span className="text-xs font-medium text-lumina-primary-text">Contents</span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-lumina-secondary-text hover:text-lumina-primary-text"
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {items.length > 0 ? (
          <NavList items={items} onNavigate={onNavigate} />
        ) : (
          <p className="px-3 py-2 text-xs text-lumina-secondary-text">No table of contents</p>
        )}
      </div>
    </div>
  );
}
