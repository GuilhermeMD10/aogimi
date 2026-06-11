'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { ReaderStateProvider, useReaderState } from '@/components/providers/ReaderStateProvider';
import { BubbleProvider, useBubble } from '@/components/providers/BubbleProvider';
import { DictionaryStateProvider } from '@/components/providers/DictionaryStateProvider';
import { DecksProvider } from '@/components/providers/DecksProvider';
import { ShortcutsProvider } from '@/components/providers/ShortcutsProvider';
import WorkspaceNav from '@/components/WorkspaceNav';
import ProfileBubble from '@/components/page-bubbles/ProfileBubble';
import SettingsBubble from '@/components/page-bubbles/SettingsBubble';
import ReaderBubble from '@/components/page-bubbles/ReaderBubble';
import { ShortcutsCheatsheet } from '@/components/ui/ShortcutsCheatsheet';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname === '/authenticate';

  // Pages whose render set depends on the auth-vs-route relationship. We
  // stash the same predicate the effect uses so the early-return below
  // doesn't drift from the redirect condition.
  const needsRedirect = !loading && ((!user && !isAuthPage) || (user && isAuthPage));

  useEffect(() => {
    if (loading) return;
    if (!user && !isAuthPage) router.replace('/authenticate');
    else if (user && isAuthPage) router.replace('/');
  }, [user, loading, isAuthPage, router]);

  // Block rendering while loading or while the redirect is about to fire.
  // Avoids a frame of "wrong page for current auth state" before navigation.
  if (loading || needsRedirect) return null;

  return (
    <ShortcutsProvider>
      <ReaderStateProvider>
        <DictionaryStateProvider>
          <DecksProvider>
            <BubbleProvider>
              <ShellContent isAuthPage={isAuthPage}>{children}</ShellContent>
              <ShortcutsCheatsheet />
            </BubbleProvider>
          </DecksProvider>
        </DictionaryStateProvider>
      </ReaderStateProvider>
    </ShortcutsProvider>
  );
}

function ShellContent({ isAuthPage, children }: { isAuthPage: boolean; children: React.ReactNode }) {
  const { activeBubble, setActiveBubble, toggleBubble } = useBubble();
  const { readerBubble, setReaderBubble } = useReaderState();

  return (
    <main className="h-full w-full">
      {children}

      {!isAuthPage && (
        <WorkspaceNav activeBubble={activeBubble} onToggleBubble={toggleBubble} />
      )}

      {activeBubble === 'profile' && <ProfileBubble onClose={() => setActiveBubble(null)} />}
      {activeBubble === 'settings' && <SettingsBubble onClose={() => setActiveBubble(null)} />}

      {readerBubble && (readerBubble.mode === 'dict' ? (
        <ReaderBubble mode="dict" onClose={() => setReaderBubble(null)} />
      ) : (
        <ReaderBubble
          key={readerBubble.word}
          mode="addCard"
          word={readerBubble.word}
          back={readerBubble.back}
          contextSentence={readerBubble.contextSentence}
          onClose={() => setReaderBubble(null)}
        />
      ))}
    </main>
  );
}
