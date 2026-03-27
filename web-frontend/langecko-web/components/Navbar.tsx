'use client';

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
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { label: 'Logo', href: '/' },
  { label: 'Epub pdf Reader', href: '/epub-pdf-reader' },
  { label: 'Dictionary', href: '/dictionary' },
  { label: 'Modular', href: '/modular' },
  { label: 'Profile', href: '#' },
  { label: 'Settings', href: '#' },
];

function NavbarToggleButton() {
  const { state, toggleSidebar } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className="w-full rounded-md border border-lumina-border-divider px-2 py-1 text-xs text-black hover:bg-black/5"
    >
      {state === 'expanded' ? 'Collapse' : 'Expand'}
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
            {navItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  asChild
                  isActive={item.href !== '#' && pathname === item.href}
                  className="h-10 rounded-xl text-black hover:bg-black/5 data-[active=true]:bg-black/10 data-[active=true]:text-black"
                >
                  {item.href === '#' ? (
                    <button type="button" className="w-full text-left">
                      {item.label}
                    </button>
                  ) : (
                    <Link href={item.href}>{item.label}</Link>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
