'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
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

type NavItem = {
  label: string;
  href: string;
  Icon?: ComponentType<{ active?: boolean; size?: number }>;
};

const navItems: NavItem[] = [
  { label: 'Logo', href: '/' },
  { label: 'Epub pdf Reader', href: '/epub-pdf-reader', Icon: ReaderIcon },
  { label: 'Dictionary', href: '/dictionary', Icon: DictionaryIcon },
  { label: 'Modular', href: '/modular', Icon: ModularIcon },
  { label: 'Cards', href: '/cards', Icon: CardsListIcon },
  { label: 'Profile', href: '#' },
  { label: 'Settings', href: '#' },
];

function NavbarToggleButton() {
  const { state, toggleSidebar } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className="flex w-full items-center justify-center rounded-md border border-lumina-border-divider px-2 py-1 hover:bg-black/5"
    >
      {state === 'expanded' ? <NavbarCollapseIcon size={20} /> : <NavbarExpandIcon size={20} />}
    </button>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-lumina-border-divider bg-lumina-sidebar-background text-black"
    >
      <SidebarHeader>
        <NavbarToggleButton />
      </SidebarHeader>

      <SidebarContent className="justify-center">
        <SidebarGroup>
          <SidebarGroupLabel className="text-black">Navigation</SidebarGroupLabel>
          <SidebarMenu className="gap-2">
            {navItems.map((item) => {
              const isActive = item.href !== '#' && pathname === item.href;
              return (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className="h-10 rounded text-black hover:bg-black/5 data-[active=true]:bg-black/10 data-[active=true]:text-black"
                  >
                    {item.href === '#' ? (
                      <button type="button" className="w-full text-left">
                        {item.Icon ? <item.Icon active={isActive} size={20} /> : null}
                        {item.label}
                      </button>
                    ) : (
                      <Link href={item.href}>
                        {item.Icon ? <item.Icon active={isActive} size={20} /> : null}
                        {item.label}
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
