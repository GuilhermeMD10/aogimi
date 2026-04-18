'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { ReaderStateProvider } from '@/components/providers/ReaderStateProvider';
import Navbar from '@/components/Navbar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Not logged in (or still loading): render children directly, no sidebar
  if (!user) {
    return (
      <ReaderStateProvider>
        <main className="h-full w-full">
          {children}
        </main>
      </ReaderStateProvider>
    );
  }

  // Logged in: full app shell with sidebar + reader state
  return (
    <SidebarProvider className="h-full min-h-0 bg-background">
      <Navbar />
      <SidebarInset className="h-full min-h-0">
        <ReaderStateProvider>
          <main className="h-full w-full overflow-auto">
            {children}
          </main>
        </ReaderStateProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
