'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { ReaderStateProvider, useReaderState } from '@/components/providers/ReaderStateProvider';
import { BubbleProvider, useBubble } from '@/components/providers/BubbleProvider';
import { DictionaryStateProvider, useDictionaryState } from '@/components/providers/DictionaryStateProvider';
import { ShortcutsProvider } from '@/components/providers/ShortcutsProvider';
import WorkspaceNav from '@/components/WorkspaceNav';
import ProfileBubble from '@/components/page-bubbles/ProfileBubble';
import ReaderBubble from '@/components/page-bubbles/ReaderBubble';
import { ShortcutsCheatsheet } from '@/components/ui/ShortcutsCheatsheet';

// Routes where the dictionary surface is *always* visible — pendingDictSearch
// flows directly into the provider and the reader bubble stays closed.
// `/reader` is conditional (sidekick open?), see `isDictSurfaceVisible` below.
const ALWAYS_DICT_VISIBLE_ROUTES = new Set(['/dictionary']);

function isDictSurfaceVisible(pathname: string, sidekickOpen: boolean): boolean {
  if (ALWAYS_DICT_VISIBLE_ROUTES.has(pathname)) return true;
  if (pathname === '/reader' && sidekickOpen) return true;
  return false;
}

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
    <ShortcutsProvider>
      <ReaderStateProvider>
        <DictionaryStateProvider>
          <BubbleProvider>
            <ShellContent isAuthPage={isAuthPage}>{children}</ShellContent>
            <ShortcutsCheatsheet />
          </BubbleProvider>
        </DictionaryStateProvider>
      </ReaderStateProvider>
    </ShortcutsProvider>
  );
}

type ReaderBubbleState =
  | { mode: 'dict' }
  | { mode: 'addCard'; word: string; back: string; contextSentence?: string };

function ShellContent({ isAuthPage, children }: { isAuthPage: boolean; children: React.ReactNode }) {
  const { activeBubble, setActiveBubble, toggleBubble } = useBubble();
  const pathname = usePathname();
  const dict = useDictionaryState();
  const {
    pendingDictSearch, setPendingDictSearch,
    pendingCard, setPendingCard,
    sidekickOpen,
  } = useReaderState();
  const [readerBubble, setReaderBubble] = useState<ReaderBubbleState | null>(null);

  // The two effects below clear their trigger via setX(null) inside the
  // effect body, which schedules another render. If a context dep (e.g. the
  // `dict` value object) also rerenders unstably, the effect can be invoked
  // before the cleared state has propagated. The refs below remember which
  // exact request object we already fired for and short-circuit on re-entry.
  const firedDictRef = useRef<typeof pendingDictSearch>(null);
  const firedCardRef = useRef<typeof pendingCard>(null);

  // Reader queued a dictionary lookup. The provider is the single source of
  // truth — drive it directly, then decide whether the bubble needs to open.
  // setState in effect is intentional: we're syncing state from external
  // "pending" triggers from other providers, gated by `firedDictRef` /
  // `firedCardRef` so it can't cascade.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!pendingDictSearch || firedDictRef.current === pendingDictSearch) return;
    firedDictRef.current = pendingDictSearch;
    void dict.runSearch(pendingDictSearch.word, pendingDictSearch.contextSentence);
    if (!isDictSurfaceVisible(pathname, sidekickOpen)) {
      setReaderBubble({ mode: 'dict' });
    }
    setPendingDictSearch(null);
  }, [pendingDictSearch, setPendingDictSearch, pathname, dict, sidekickOpen]);

  // Reader (or dictionary) queued a flashcard. The decks page doesn't share
  // any pre-filled state, so always open the addCard bubble.
  useEffect(() => {
    if (!pendingCard || firedCardRef.current === pendingCard) return;
    firedCardRef.current = pendingCard;
    setReaderBubble({
      mode: 'addCard',
      word: pendingCard.word,
      back: pendingCard.back ?? '',
      contextSentence: pendingCard.contextSentence,
    });
    setPendingCard(null);
  }, [pendingCard, setPendingCard]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <main className="h-full w-full">
      {children}

      {!isAuthPage && (
        <WorkspaceNav activeBubble={activeBubble} onToggleBubble={toggleBubble} />
      )}

      {activeBubble === 'profile' && <ProfileBubble onClose={() => setActiveBubble(null)} />}

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
