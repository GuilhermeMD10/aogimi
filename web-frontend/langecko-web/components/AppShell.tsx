'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { ReaderStateProvider, useReaderState } from '@/components/providers/ReaderStateProvider';
import { BubbleProvider, useBubble } from '@/components/providers/BubbleProvider';
import { DictionaryStateProvider, useDictionaryState } from '@/components/providers/DictionaryStateProvider';
import WorkspaceNav from '@/components/WorkspaceNav';
import ProfileBubble from '@/components/page-bubbles/ProfileBubble';
import ReaderBubble from '@/components/page-bubbles/ReaderBubble';

// Routes where the dictionary surface is already visible — pendingDictSearch
// flows directly into the provider and the reader bubble stays closed.
const DICT_VISIBLE_ROUTES = new Set(['/workspace', '/dictionary']);

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
      <DictionaryStateProvider>
        <BubbleProvider>
          <ShellContent isAuthPage={isAuthPage}>{children}</ShellContent>
        </BubbleProvider>
      </DictionaryStateProvider>
    </ReaderStateProvider>
  );
}

type ReaderBubbleState =
  | { mode: 'dict' }
  | { mode: 'addCard'; word: string; back: string; contextSentence?: string };

function ShellContent({ isAuthPage, children }: { isAuthPage: boolean; children: React.ReactNode }) {
  const { activeBubble, setActiveBubble, toggleBubble } = useBubble();
  const pathname = usePathname();
  const dict = useDictionaryState();
  const { pendingDictSearch, setPendingDictSearch, pendingCard, setPendingCard } = useReaderState();
  const [readerBubble, setReaderBubble] = useState<ReaderBubbleState | null>(null);

  // Reader queued a dictionary lookup. The provider is the single source of
  // truth — drive it directly, then decide whether the bubble needs to open.
  useEffect(() => {
    if (!pendingDictSearch) return;
    void dict.runSearch(pendingDictSearch.word, pendingDictSearch.contextSentence);
    if (!DICT_VISIBLE_ROUTES.has(pathname)) {
      setReaderBubble({ mode: 'dict' });
    }
    setPendingDictSearch(null);
  }, [pendingDictSearch, setPendingDictSearch, pathname, dict]);

  // Reader (or dictionary) queued a flashcard. The decks page doesn't share
  // any pre-filled state, so always open the addCard bubble.
  useEffect(() => {
    if (!pendingCard) return;
    setReaderBubble({
      mode: 'addCard',
      word: pendingCard.word,
      back: pendingCard.back ?? '',
      contextSentence: pendingCard.contextSentence,
    });
    setPendingCard(null);
  }, [pendingCard, setPendingCard]);

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
