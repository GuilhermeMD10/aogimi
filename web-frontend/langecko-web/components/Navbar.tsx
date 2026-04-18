'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  BookOpen,
  Search,
  Layers,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/components/providers/AuthProvider';

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
};

const navItems: NavItem[] = [
  { key: 'home',       label: 'Home',       href: '/modular',         icon: Home },
  { key: 'reader',     label: 'Reader',     href: '/epub-pdf-reader', icon: BookOpen },
  { key: 'dictionary', label: 'Dictionary', href: '/dictionary',      icon: Search },
  { key: 'decks',      label: 'Decks',      href: '/cards',           icon: Layers },
];

export default function Navbar() {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      {/* ── Brand header ─────────────────────────────────────────────── */}
      <SidebarHeader className="gap-0 p-2.5 pb-3.5">
        <div className="flex items-center gap-2 px-1.5 pb-0">
          <div
            className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-[7px] bg-lgc-accent text-white"
            style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600 }}
          >
            読
          </div>
          <span
            className="truncate text-sm font-medium text-lgc-fg group-data-[collapsible=icon]:hidden"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Langeco
          </span>
          <button
            type="button"
            onClick={toggleSidebar}
            className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-lgc-fg-muted transition-colors hover:bg-lgc-bg-elev hover:text-lgc-fg group-data-[collapsible=icon]:hidden"
            aria-label="Collapse sidebar"
          >
            <PanelLeft size={13} />
          </button>
        </div>
      </SidebarHeader>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <SidebarContent className="px-2 pt-0">
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`
                  flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 text-[13px] transition-colors
                  ${collapsed ? 'justify-center px-0' : ''}
                  ${
                    isActive
                      ? 'border-lgc-border bg-lgc-bg-elev font-semibold text-lgc-accent'
                      : 'border-transparent text-lgc-fg-muted hover:bg-lgc-bg-elev hover:text-lgc-fg'
                  }
                `}
              >
                <item.icon size={15} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </SidebarContent>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <SidebarFooter className="p-2.5">
        {/* Expand button (collapsed only) */}
        {collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="mx-auto flex h-8 w-9 items-center justify-center rounded-md text-lgc-fg-muted transition-colors hover:bg-lgc-bg-elev hover:text-lgc-fg"
            aria-label="Expand sidebar"
          >
            <PanelRight size={14} />
          </button>
        )}

        {/* User avatar */}
        <div
          className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          <div
            className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full text-[11px] text-white"
            style={{
              background: 'linear-gradient(135deg, var(--lgc-accent), var(--lgc-accent))',
              fontFamily: 'var(--font-display)',
            }}
          >
            {user?.username?.charAt(0).toUpperCase() ?? '?'}
          </div>
          {!collapsed && (
            <span className="truncate text-xs text-lgc-fg">
              {user?.username ?? 'User'}
            </span>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
