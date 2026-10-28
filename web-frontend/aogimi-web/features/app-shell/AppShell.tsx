'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import {
  ReaderStateProvider,
  useReaderState,
  SkyHueProvider,
  FrameOverrideProvider,
} from '@/features/app-shell/providers';
import { DictionaryStateProvider } from '@/features/dictionary';
import { DecksProvider } from '@/features/sky/stage';
import { AppFrame } from '@/features/app-shell/components/AppFrame';
import { isPublicRoute } from '@/features/app-shell/lib/publicRoutes';
import { ReaderModal, AddedToast } from '@/features/books';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname === '/authenticate';
  // Open to everyone, so never redirected (`lib/publicRoutes.ts`).
  const isPublicPage = isPublicRoute(pathname);

  // Pages whose render set depends on the auth-vs-route relationship. We
  // stash the same predicate the effect uses so the early-return below
  // doesn't drift from the redirect condition.
  const needsRedirect =
    !loading && !isPublicPage && ((!user && !isAuthPage) || (user && isAuthPage));

  useEffect(() => {
    if (loading || isPublicPage) return;
    if (!user && !isAuthPage) router.replace('/authenticate');
    else if (user && isAuthPage) router.replace('/');
  }, [user, loading, isAuthPage, isPublicPage, router]);

  // Block rendering while loading or while the redirect is about to fire.
  // Avoids a frame of "wrong page for current auth state" before navigation.
  if (loading || needsRedirect) return null;

  return (
    <SkyHueProvider>
      <ReaderStateProvider>
        <DictionaryStateProvider>
          <DecksProvider>
            <FrameOverrideProvider>
              <ShellContent framed={!isAuthPage && (!isPublicPage || !!user)}>
                {children}
              </ShellContent>
            </FrameOverrideProvider>
          </DecksProvider>
        </DictionaryStateProvider>
      </ReaderStateProvider>
    </SkyHueProvider>
  );
}

/**
 * `framed` wraps the page in `AppFrame` (nav, gutters). Only signed-out
 * screens render bare — `/authenticate`, and a public page opened without an
 * account — every signed-in page, an open book included, gets the frame (D2).
 */
function ShellContent({ framed, children }: { framed: boolean; children: React.ReactNode }) {
  const { readerModal, setReaderModal, setPendingCard } = useReaderState();
  /** The deck a card just went into — shows the toast until it clears. */
  const [added, setAdded] = useState<string | null>(null);

  // Closing the add-card modal also clears `pendingCard`. Without this the
  // decks page would observe the still-set pendingCard on next mount and
  // re-open the same add-card flow, letting the user duplicate the card they
  // just created. Both signals are seeded together in
  // `useReaderActions.openAddCard`; tearing both down together keeps them in
  // lockstep.
  const closeAddCard = useCallback(() => {
    setReaderModal(null);
    setPendingCard(null);
  }, [setReaderModal, setPendingCard]);

  const onCreated = useCallback(
    (deckName: string) => {
      closeAddCard();
      setAdded(deckName);
    },
    [closeAddCard],
  );
  const clearAdded = useCallback(() => setAdded(null), []);

  return (
    <>
      {framed ? <AppFrame>{children}</AppFrame> : <main className="h-full w-full">{children}</main>}

      {readerModal && (readerModal.mode === 'dict' ? (
        <ReaderModal mode="dict" onClose={() => setReaderModal(null)} onCreated={onCreated} />
      ) : (
        <ReaderModal
          // Pre-existing hazard, deliberately left alone: adding the *same*
          // headword twice from two different sources keeps the same key, so
          // the modal does not remount and its seeded phase — built from the
          // first request's draft — is not reseeded from the second request.
          key={readerModal.word}
          mode="addCard"
          word={readerModal.word}
          draft={readerModal.draft}
          contextSentence={readerModal.contextSentence}
          dictVisibleBehind={readerModal.dictVisibleBehind}
          onClose={closeAddCard}
          onCreated={onCreated}
        />
      ))}

      {added && <AddedToast deckName={added} onDone={clearAdded} />}
    </>
  );
}
