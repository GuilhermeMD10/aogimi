'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { ReaderStateProvider, useReaderState } from '@/components/providers/ReaderStateProvider';
import { DictionaryStateProvider } from '@/features/dictionary';
import { DecksProvider } from '@/components/providers/DecksProvider';
import WorkspaceNav from '@/components/WorkspaceNav';
import { ReaderBubble } from '@/features/books';

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
    <ReaderStateProvider>
      <DictionaryStateProvider>
        <DecksProvider>
          <ShellContent isAuthPage={isAuthPage}>{children}</ShellContent>
        </DecksProvider>
      </DictionaryStateProvider>
    </ReaderStateProvider>
  );
}

function ShellContent({ isAuthPage, children }: { isAuthPage: boolean; children: React.ReactNode }) {
  const { readerBubble, setReaderBubble, setPendingCard } = useReaderState();

  // addCard bubble close also clears `pendingCard`. Without this the
  // decks page would observe the still-set pendingCard on next mount
  // and re-open the same add-card flow, letting the user duplicate the
  // card they just created. Both signals are seeded together in
  // `useReaderActions.requestAddCard`; tearing both down together
  // keeps them in lockstep.
  const closeAddCardBubble = () => {
    setReaderBubble(null);
    setPendingCard(null);
  };

  return (
    <main className="h-full w-full">
      {children}

      {!isAuthPage && <WorkspaceNav />}

      {readerBubble && (readerBubble.mode === 'dict' ? (
        <ReaderBubble mode="dict" onClose={() => setReaderBubble(null)} />
      ) : (
        <ReaderBubble
          key={readerBubble.word}
          mode="addCard"
          word={readerBubble.word}
          back={readerBubble.back}
          contextSentence={readerBubble.contextSentence}
          onClose={closeAddCardBubble}
        />
      ))}
    </main>
  );
}
