'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { ReaderStateProvider, useReaderState } from '@/features/app-shell/providers/ReaderStateProvider';
import { SkyHueProvider } from '@/features/app-shell/providers/SkyHueProvider';
import { DictionaryStateProvider } from '@/features/dictionary';
import { DecksProvider } from '@/features/study/decks';
import Dock from '@/features/app-shell/Dock';
import { ReaderBubble } from '@/features/books';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname === '/authenticate';

  // An open book owns the whole window: the reading pane fills it (the route
  // reserves no bottom padding, unlike every other screen), so the dock would
  // float over the page text rather than below it. Leaving a book is the
  // toolbar's back button, and the dock comes back with the shelf.
  //
  // A prefix test, not equality. `/reader` has no page of its own — it is only
  // the `[bookId]` parent segment, since the shelf moved to `/` — but the test
  // stays a prefix so it can never match that bare segment by accident.
  const isOpenBook = pathname.startsWith('/reader/');

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
    <SkyHueProvider>
      <ReaderStateProvider>
        <DictionaryStateProvider>
          <DecksProvider>
            <ShellContent showDock={!isAuthPage && !isOpenBook}>{children}</ShellContent>
          </DecksProvider>
        </DictionaryStateProvider>
      </ReaderStateProvider>
    </SkyHueProvider>
  );
}

function ShellContent({ showDock, children }: { showDock: boolean; children: React.ReactNode }) {
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

      {showDock && <Dock />}

      {readerBubble && (readerBubble.mode === 'dict' ? (
        <ReaderBubble mode="dict" onClose={() => setReaderBubble(null)} />
      ) : (
        <ReaderBubble
          // Pre-existing hazard, deliberately left alone: adding the *same*
          // headword twice from two different sources (say the reader's
          // selection and then a rail row) keeps the same key, so the bubble
          // does not remount and its seeded phase state — the initial
          // select-deck phase, built from the first request's draft — is not
          // reseeded from the second request. Out of scope here; flagged so the
          // next person to touch the key knows it isn't already handled.
          key={readerBubble.word}
          mode="addCard"
          word={readerBubble.word}
          draft={readerBubble.draft}
          contextSentence={readerBubble.contextSentence}
          dictVisibleBehind={readerBubble.dictVisibleBehind}
          onClose={closeAddCardBubble}
        />
      ))}
    </main>
  );
}
