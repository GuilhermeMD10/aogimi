'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { ReaderStateProvider } from '@/components/providers/ReaderStateProvider';
import { WorkspaceTabsProvider } from '@/components/providers/WorkspaceTabsProvider';
import WorkspaceNav, { type BubbleKey } from '@/components/WorkspaceNav';
import ProfileBubble from '@/components/page-bubbles/ProfileBubble';

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
      router.replace('/');
    }
  }, [user, loading, isAuthPage, router]);

  if (loading) return null;
  if (!user && !isAuthPage) return null;
  if (user && isAuthPage) return null;

  return (
    <ReaderStateProvider>
      <WorkspaceTabsProvider>
        <ShellContent isAuthPage={isAuthPage}>{children}</ShellContent>
      </WorkspaceTabsProvider>
    </ReaderStateProvider>
  );
}

function ShellContent({ isAuthPage, children }: { isAuthPage: boolean; children: React.ReactNode }) {
  const [activeBubble, setActiveBubble] = useState<BubbleKey | null>(null);

  const handleToggleBubble = useCallback((key: BubbleKey) => {
    setActiveBubble((prev) => (prev === key ? null : key));
  }, []);

  return (
    <main className="h-full w-full">
      {children}

      {!isAuthPage && (
        <WorkspaceNav activeBubble={activeBubble} onToggleBubble={handleToggleBubble} />
      )}

      {activeBubble === 'profile' && <ProfileBubble onClose={() => setActiveBubble(null)} />}
    </main>
  );
}
