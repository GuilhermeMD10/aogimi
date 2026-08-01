'use client';

import { useState, type SubmitEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Search, Star } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  Chip,
  CoverTile,
  Eyebrow,
  MonoAction,
  ProgressTrack,
  Skeleton,
  StageDot,
  coverPalette,
} from '@/shared/components';
import { useReaderState } from '@/features/app-shell/providers/ReaderStateProvider';
import { deckVisuals } from '@/features/study/decks';
import { useDecks } from '@/features/study/decks/providers/DecksProvider';
import { useBooks } from '../hooks/useBooks';
import { useDueSummary } from '../hooks/useDueSummary';
import { useRecentSearches } from '../hooks/useRecentSearches';
import { useRecentUpgrades } from '../hooks/useRecentUpgrades';
import { useStudyWord } from '../hooks/useStudyWord';
import { relativeTime } from '../lib/relativeTime';

/**
 * Home's cards — everything below the hero banner.
 *
 * Each one owns its own request, its own empty state and its own skeleton, so a
 * slow deck query never holds up the shelf. The rule throughout: **the card
 * stays, the shell stays, the content softens.** No card is hidden because its
 * data is empty, and every skeleton reserves the height its content will take
 * so nothing shifts on arrival.
 *
 * Reading progress is a percentage only. The design shows `PAGE 142 / 412`
 * beside it, but EPUB position is tracked as a CFI and a spine index — there is
 * no page number to print.
 */

const RECENT_SEARCH_ROWS = 3;
const LIBRARY_COVERS = 3;
const DUE_CHIPS = 3;
const RECENT_DECKS = 3;

// ── Continue reading ────────────────────────────────────────────────────────

export function ContinueReadingCard() {
  const router = useRouter();
  const { setPendingBookOpen } = useReaderState();
  const { current, loading } = useBooks();

  // Not a link: resuming has to seed `pendingBookOpen` before navigating. The
  // reader checks for the local file itself, so setting it unconditionally is
  // safe — if this device doesn't have the file, the reader offers to locate it.
  const resume = () => {
    if (!current) return;
    setPendingBookOpen(current.filename);
    router.push('/reader');
  };

  if (loading) {
    return (
      <Card className="flex gap-5" aria-labelledby="home-reading">
        <Skeleton className="h-[134px] w-24 shrink-0" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-7 w-2/3" />
          <div className="mt-auto flex flex-col gap-3">
            <Skeleton className="h-1.5 w-full" />
            <Skeleton className="h-11 w-40" />
          </div>
        </div>
      </Card>
    );
  }

  if (!current) {
    return (
      <Card className="flex flex-col" aria-labelledby="home-reading">
        <h2 id="home-reading" className="sr-only">
          Continue reading
        </h2>
        <p className="font-[family-name:var(--face-ui)] text-[15px] text-(--soft)">
          Nothing open yet.
        </p>
        <div className="mt-auto pt-3">
          <Button href="/reader" variant="secondary">
            Open the library
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex gap-5" aria-labelledby="home-reading">
      <CoverTile
        title={current.title}
        seed={current.filename}
        percent={current.progress}
        raised
        className="h-[134px] w-24 shrink-0"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <h2
          id="home-reading"
          className="font-[family-name:var(--face-ui)] text-[26px] leading-[1.1] font-bold text-(--ink)"
        >
          {current.title}
        </h2>

        <div className="mt-auto pt-3">
          <div className="mb-1.5 flex justify-end font-[family-name:var(--face-mono)] text-[12.5px] text-(--muted)">
            <span>{current.progress}%</span>
          </div>
          <ProgressTrack percent={current.progress} className="mb-[13px]" />
          <Button onClick={resume} icon={<Play size={15} fill="currentColor" />}>
            Resume reading
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ── Study ───────────────────────────────────────────────────────────────────

export function StudyCard() {
  const { total, dueDecks, loading } = useDueSummary();

  if (loading) {
    return (
      <Card className="flex flex-col" aria-labelledby="home-study">
        <Skeleton className="h-11 w-32" />
        <div className="mt-3.5 flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="mt-auto h-11 w-36" />
      </Card>
    );
  }

  const shown = dueDecks.slice(0, DUE_CHIPS);
  const overflow = dueDecks.length - shown.length;

  return (
    <Card className="flex flex-col" aria-labelledby="home-study">
      <div className="flex items-baseline gap-2.5">
        <span
          id="home-study"
          className="font-[family-name:var(--face-ui)] text-[44px] leading-none font-bold text-(--ink)"
        >
          {total}
        </span>
        <span className="font-[family-name:var(--face-ui)] text-base font-bold text-(--soft)">
          cards due
        </span>
      </div>

      {total === 0 ? (
        <p className="mt-3.5 font-[family-name:var(--face-ui)] text-[15px] text-(--soft)">
          Nothing due — the sky is quiet.
        </p>
      ) : (
        <div className="mt-3.5 flex flex-wrap gap-2">
          {shown.map((deck) => (
            <Chip key={deck.id} href={`/study?deck=${deck.id}&due=1`}>
              {deckVisuals(deck.name).kamon} {deck.name} · {deck.count}
            </Chip>
          ))}
          {overflow > 0 && <Chip>+{overflow}</Chip>}
        </div>
      )}

      <div className="mt-auto flex items-center gap-3 pt-3">
        {total === 0 ? (
          <Button href="/study" variant="secondary">
            Study ahead
          </Button>
        ) : (
          <Button href="/study?due=1" icon={<Star size={15} />}>
            Study now
          </Button>
        )}
      </div>
    </Card>
  );
}

// ── Library ─────────────────────────────────────────────────────────────────

export function LibraryCard() {
  const router = useRouter();
  const { setPendingBookOpen } = useReaderState();
  const { books, loading } = useBooks();

  const open = (filename: string) => {
    setPendingBookOpen(filename);
    router.push('/reader');
  };

  const shelf = books.slice(0, LIBRARY_COVERS);

  return (
    <Card className="flex flex-col" aria-labelledby="home-library">
      <CardHeader
        id="home-library"
        title="Library"
        action={
          <MonoAction href="/reader">
            {!loading && books.length === 0 ? 'ADD A BOOK' : 'VIEW ALL →'}
          </MonoAction>
        }
        className="mb-[18px]"
      />

      {loading ? (
        <div className="mt-auto grid grid-cols-3 gap-4">
          {Array.from({ length: LIBRARY_COVERS }, (_, i) => (
            <Skeleton key={i} className="aspect-[96/140] w-full" />
          ))}
        </div>
      ) : shelf.length === 0 ? (
        <p className="font-[family-name:var(--face-ui)] text-[15px] text-(--soft)">
          Your shelf is empty.
        </p>
      ) : (
        // Fewer than three books leaves empty cells rather than padding with
        // placeholders — a fake cover reads as a real book.
        <div className="mt-auto grid grid-cols-3 gap-4">
          {shelf.map((book) => (
            <button
              key={book.id}
              type="button"
              onClick={() => open(book.filename)}
              aria-label={`Open ${book.title}`}
              className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
            >
              <CoverTile
                title={book.title}
                seed={book.filename}
                percent={book.progress}
                className="aspect-[96/140] w-full"
              />
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Dictionary ──────────────────────────────────────────────────────────────

export function DictionaryCard() {
  const { items, loading } = useRecentSearches(RECENT_SEARCH_ROWS);

  return (
    <Card className="flex flex-col" aria-labelledby="home-dictionary">
      <CardHeader
        id="home-dictionary"
        title="Dictionary"
        action={<MonoAction href="/dictionary">VIEW ALL →</MonoAction>}
        className="mb-3.5"
      />

      <SearchShortcut />

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: RECENT_SEARCH_ROWS }, (_, i) => (
            <Skeleton key={i} className="h-[42px] w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="font-[family-name:var(--face-ui)] text-[15px] text-(--muted)">
          No lookups yet.
        </p>
      ) : (
        <ul className="flex flex-col">
          {items.map((item, i) => (
            <li key={`${item.query}-${item.at}`}>
              {/* Back into a search, not to an entry: the store keeps the term
                  only, so there is no id to deep-link to. */}
              <Link
                href={`/dictionary?q=${encodeURIComponent(item.query)}`}
                className={`flex items-center gap-3 px-1 py-3 ${
                  i < items.length - 1 ? 'border-b border-(--bd)' : ''
                } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)`}
              >
                <span className="min-w-[74px] font-[family-name:var(--face-jp)] text-2xl font-medium text-(--ink)">
                  {item.query}
                </span>
                <span className="ml-auto font-[family-name:var(--face-mono)] text-[11.5px] text-(--faint)">
                  {relativeTime(item.at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * A real search field, not a link dressed as one — a shortcut for people who
 * already know what they're looking for and don't want a page load first.
 *
 * It owns nothing but the draft text. Submitting hands the term to
 * `/dictionary?q=…`, which `DictionaryView` already reads on mount and runs
 * through the dictionary's own search state. So there's exactly one place that
 * knows how to search; this is a second doorway into it, not a second
 * implementation.
 *
 * Uses `router.push`, not a form GET — a native submit would reload the page.
 */
function SearchShortcut() {
  const router = useRouter();
  const [draft, setDraft] = useState('');

  const submit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = draft.trim();
    if (!q) return; // Enter on an empty field shouldn't navigate anywhere.
    router.push(`/dictionary?q=${encodeURIComponent(q)}`);
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      className="mb-2.5 flex items-center gap-2.5 rounded-(--radius-input) border-[1.5px] border-(--ink) bg-(--card) px-4 py-[13px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--ink)"
    >
      {/* Submit button rather than decoration, so the glyph is clickable too.
          The second and last place vermilion appears. */}
      <button type="submit" aria-label="Search the dictionary" className="shrink-0 cursor-pointer">
        <Search size={16} className="stroke-(--accent)" strokeWidth={2} />
      </button>
      <input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="言葉を引く · look up a word…"
        aria-label="Look up a word"
        // The field carries the card's type styling; the border and focus ring
        // belong to the form, so the input itself draws nothing of its own.
        className="w-full min-w-0 bg-transparent font-[family-name:var(--face-ui)] text-[15px] text-(--ink) outline-none placeholder:text-(--soft)"
      />
    </form>
  );
}

// ── Decks panel ─────────────────────────────────────────────────────────────

export function DecksPanel() {
  return (
    <Card variant="panel" aria-labelledby="home-decks">
      <div className="flex items-center justify-between border-b border-(--bd) px-[26px] py-5">
        <h2
          id="home-decks"
          className="font-[family-name:var(--face-ui)] text-2xl font-bold text-(--ink)"
        >
          Decks
        </h2>
        <MonoAction href="/decks">VIEW ALL →</MonoAction>
      </div>

      {/* Three columns, and they stay three even when a column is empty — the
          rhythm is the point. Each keeps its eyebrow and softens its body. */}
      <div className="grid lg:grid-cols-[1.6fr_1.2fr_1.2fr]">
        <div className="border-(--bd) px-[26px] py-[22px] lg:border-r">
          <RecentDecks />
        </div>
        <div className="border-(--bd) px-[26px] py-[22px] lg:border-r">
          <RecentUpgrades />
        </div>
        <div className="px-[26px] py-[22px]">
          <StudyWord />
        </div>
      </div>
    </Card>
  );
}

function RecentDecks() {
  const { decks } = useDecks();
  const shown = (decks ?? []).slice(0, RECENT_DECKS);

  return (
    <>
      <Eyebrow className="mb-4">Recent decks</Eyebrow>
      {decks === null ? (
        <div className="flex flex-col gap-3.5">
          {Array.from({ length: RECENT_DECKS }, (_, i) => (
            <Skeleton key={i} className="h-[68px] w-full" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Empty>No decks yet.</Empty>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {shown.map((deck) => {
            // Glyph from the outgoing helper (it's just a kanji, palette-free);
            // colour from the new four-cover ramp.
            const { kamon } = deckVisuals(deck.name);
            const { surface, ink } = coverPalette(deck.name);
            return (
              <li key={deck.id}>
                {/* The decks list, not this deck: `DecksView` picks its active
                    deck from local state, so there's no param to deep-link
                    with. Wiring one up belongs to that screen's redesign. */}
                <Link
                  href="/decks"
                  className="flex items-center gap-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
                >
                  <span
                    aria-hidden
                    className="flex h-[68px] w-[52px] shrink-0 items-center justify-center rounded-(--radius-tile) font-[family-name:var(--face-jp)] text-[26px] font-medium"
                    style={{ background: surface, color: ink }}
                  >
                    {kamon}
                  </span>
                  <span className="flex-1">
                    <span className="block font-[family-name:var(--face-ui)] text-base font-bold text-(--ink)">
                      {deck.name}
                    </span>
                    <span className="mt-1 block font-[family-name:var(--face-mono)] text-[12.5px] text-(--muted)">
                      {deck.card_count} cards
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function RecentUpgrades() {
  const { upgrades, loading } = useRecentUpgrades();

  return (
    <>
      <Eyebrow className="mb-3.5">Recent upgrades</Eyebrow>
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-[26px] w-full" />
          ))}
        </div>
      ) : upgrades.length === 0 ? (
        <Empty>Nothing upgraded yet.</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {upgrades.map((up) => (
            <li
              key={`${up.cardId}-${up.reviewedAt}`}
              className="flex items-center gap-2.5"
            >
              <span className="min-w-[38px] font-[family-name:var(--face-jp)] text-[26px] font-medium text-(--ink)">
                {up.front}
              </span>
              <span className="flex flex-1 items-center gap-2.25 font-[family-name:var(--face-mono)] text-[13px] text-(--muted)">
                <StageDot stage={up.stateBefore} />
                <span aria-hidden className="text-(--faint)">
                  →
                </span>
                <StageDot stage={up.stateAfter} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function StudyWord() {
  const { card, loading } = useStudyWord();

  return (
    <div className="flex flex-col items-center text-center">
      <Eyebrow className="mb-3.5">A word to review</Eyebrow>

      {loading ? (
        <div className="flex w-full flex-col items-center gap-3">
          <Skeleton className="h-[52px] w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-48" />
        </div>
      ) : !card ? (
        <Empty>—</Empty>
      ) : (
        <>
          <div className="font-[family-name:var(--face-jp)] text-[52px] leading-none font-medium text-(--ink)">
            {card.front}
          </div>
          {card.reading && (
            <div className="mt-2 font-[family-name:var(--face-mono)] text-sm text-(--muted)">
              {card.reading}
            </div>
          )}
          <div className="mt-3.5 font-[family-name:var(--face-ui)] text-[15.5px] leading-[1.4] text-(--soft)">
            {card.back}
          </div>
          <div className="mt-3.5">
            <Button href={`/dictionary?q=${encodeURIComponent(card.front)}`} variant="secondary">
              Look it up
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Shared bits ─────────────────────────────────────────────────────────────

function Empty({ children }: { children: string }) {
  return (
    <p className="font-[family-name:var(--face-ui)] text-[15px] text-(--muted)">{children}</p>
  );
}
