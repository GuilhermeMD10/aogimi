'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { ReaderStateProvider } from '@/components/providers/ReaderStateProvider';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname === '/authenticate';

  useEffect(() => {
    if (loading) return;

    if (!user && !isAuthPage) {
      router.replace('/authenticate');
    } else if (user && isAuthPage) {
      router.replace('/workspace');
    }
  }, [user, loading, isAuthPage, router]);

  // While loading auth state, show nothing to avoid flash
  if (loading) {
    return null;
  }

  // Not logged in and not on auth page — will redirect, show nothing
  if (!user && !isAuthPage) {
    return null;
  }

  // Logged in but on auth page — will redirect, show nothing
  if (user && isAuthPage) {
    return null;
  }

  return (
    <ReaderStateProvider>
      <main className="h-full w-full">
        {children}
      </main>
    </ReaderStateProvider>
  );
}
