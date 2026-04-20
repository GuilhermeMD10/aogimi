'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { ReaderStateProvider } from '@/components/providers/ReaderStateProvider';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Not logged in: render children directly (login page)
  if (!user) {
    return (
      <ReaderStateProvider>
        <main className="h-full w-full">
          {children}
        </main>
      </ReaderStateProvider>
    );
  }

  // Logged in: full-height layout, no sidebar — bottom nav is rendered by workspace page
  return (
    <ReaderStateProvider>
      <main className="h-full w-full">
        {children}
      </main>
    </ReaderStateProvider>
  );
}
