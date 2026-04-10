'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  CardsListIcon,
  DictionaryIcon,
  ModularIcon,
  NavbarCollapseIcon,
  NavbarExpandIcon,
  ReaderIcon,
} from '@/components/ui/icons/NavIcons';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';

type NavItem = {
  label: string;
  href: string;
  Icon?: ComponentType<{ active?: boolean; size?: number }>;
};

const navItems: NavItem[] = [
  { label: 'Epub pdf Reader', href: '/epub-pdf-reader', Icon: ReaderIcon },
  { label: 'Dictionary',      href: '/dictionary',      Icon: DictionaryIcon },
  { label: 'Modular',         href: '/modular',         Icon: ModularIcon },
  { label: 'Cards',           href: '/cards',           Icon: CardsListIcon },
];

function NavbarToggleButton() {
  const { state, toggleSidebar } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className="flex w-full items-center justify-center rounded-md px-2 py-1.5 text-lumina-sidebar-text transition-colors hover:bg-lumina-sidebar-hover-bg"
      aria-label={state === 'expanded' ? 'Collapse sidebar' : 'Expand sidebar'}
      data-ui
    >
      {state === 'expanded'
        ? <NavbarCollapseIcon size={20} />
        : <NavbarExpandIcon size={20} />}
    </button>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      {/* ── Brand header ─────────────────────────────────────────────────── */}
      <SidebarHeader className="gap-0 pb-2 pt-3">
        {/* Logo mark — visible in both expanded & collapsed states */}
        <div className="flex items-center gap-2 px-2 pb-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-lumina-primary-teal text-xs font-bold text-lumina-primary-text">
            L
          </span>
          <span className="truncate text-sm font-semibold text-lumina-sidebar-text group-data-[collapsible=icon]:hidden">
            Langecko
          </span>
        </div>

        <NavbarToggleButton />
      </SidebarHeader>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <SidebarContent className="justify-start pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-lumina-sidebar-label text-xs uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className={`
                      h-9 rounded-md text-lumina-sidebar-text transition-colors
                      hover:bg-lumina-sidebar-hover-bg hover:text-lumina-sidebar-text
                      data-[active=true]:bg-lumina-sidebar-active-bg
                      data-[active=true]:text-lumina-sidebar-text
                      data-[active=true]:font-medium
                    `}
                  >
                    <Link href={item.href} data-ui>
                      {item.Icon
                        ? <item.Icon active={isActive} size={18} />
                        : null}
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer: theme switcher ────────────────────────────────────────── */}
      <SidebarFooter className="pb-3">
        <div className="group-data-[collapsible=icon]:hidden">
          <ThemeSwitcher variant="full" />
        </div>
        {/* Collapsed state: single icon cycle button */}
        <div className="hidden group-data-[collapsible=icon]:flex justify-center">
          <ThemeSwitcher variant="compact" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
