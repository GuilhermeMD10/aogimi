import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { sendProgressBeacon } from '@/features/books/lib/booksApi';
import { useBookRecord } from '@/features/books/hooks/useBookRecord';
import type { KanjiInfo, WordDetails } from '@/features/dictionary/types';
import { locateBookFile } from '@/features/books/lib/locateBookFile';
import { useBookFile } from '@/features/books/hooks/useBookFile';
import { useAuth } from '@/features/auth/providers/AuthContext';
import {
  HIGHLIGHT_COLORS,
  MANGA_SHELL_BG,
  READER_FONT_STACKS,
  READER_THEMES,
  saveProgressSnapshot,
  useReaderStorage,
} from '../lib/readerStorage';
import { selectionStartFeedback, selectionTickFeedback } from '@/lib/haptics';
import { useReaderPrefs } from '../lib/readerPrefs';
import { LookupDrawers } from '@/features/dictionary/components/LookupDrawers';
import { kanjiCardDraft, plainCardDraft, wordCardDraft } from '@/features/dictionary/lib/cardDraft';
import { Button } from '@/shared/components/Button';
import { IconButton } from '@/shared/components/IconButton';
import { spacing, type, type Palette } from '@/theme/tokens';
import { ReaderTopBar } from './ReaderTopBar';
import { ReaderDock } from './ReaderDock';
import { BookCover } from '../../library/components/BookCover';
import { DECELERATE } from '@/theme/motion';
import { useReduceMotion } from '@/lib/useReduceMotion';
import { MangaScrollView } from './manga/MangaScrollView';
import { MangaPagedView } from './manga/MangaPagedView';
import { useMangaSpine } from './manga/useMangaSpine';
import { useReaderModals } from '../hooks/useReaderModals';
import { PdfReaderShell } from './pdf/PdfReaderShell';
import {
  FoliateReader,
  type CustomMenuEvent,
  type FoliateReaderHandle,
  type ReadyPayload,
  type RelocatedPayload,
  type SelectionPayload,
} from './novel/FoliateReader';
import type { BookType, EpubTocItem, ReaderThemeStyle } from '../lib/foliateHtml';
import { useReaderLayoutPrefs } from '../lib/readerLayout';
import { setLocalProgress } from '@/features/books/lib/booksLocalCache';
import { clearSessionPending, persistLocalProgress } from '@/features/books/lib/syncedBookCache';
import { isNewer } from '@/features/books/lib/timestamps';

type Props = { bookId: string };

/** The shortest the placing frame is allowed to be on screen.
 *
 *  A frame that is correct but brief still reads as a flash -- the reader sees
 *  *something* appear and vanish, and cannot tell that it was deliberate. The
 *  floor is what separates "the book is opening" from "something flickered".
 *
 *  It is a MINIMUM, not a duration: the frame is dismissed at whichever comes
 *  later, this or the book actually being placed. A fixed delay would be the
 *  wrong tool -- too long on a quick open, and on a slow one it would expire
 *  early and put the flicker back. */
const MIN_PLACING_MS = 1000;

/** How long the cover takes to open into the book.
 *
 *  Deliberately outside `theme/motion`'s four values. Those are the vocabulary
 *  for UI state -- a press, a fill, a pill sliding -- and all of them are under
 *  300ms because a control that lags its own tap feels broken. This is not a
 *  control changing state; it is one screen becoming another, and at 280ms the
 *  zoom reads as a glitch rather than a movement. The easing still comes from
 *  the shared vocabulary so it belongs to the same family. */
const ENTER_MS = 460;

/** How long the placing frame may hold before it gives up and shows the book
 *  anyway. Generous: it is a backstop for a book that never reports ready,
 *  not a pacing device. */
const PLACING_TIMEOUT_MS = 6000;

export function ReaderScreen({ bookId }: Props) {
  const p = usePalette();
  const t = useT();
  const styles = useStyles(p);
  const router = useRouter();
  // The Android nav bar is hidden globally from app/_layout.tsx, so no
  // per-screen call is needed here. iOS is unaffected.

  // ── Book record ─────────────────────────────────────────────────────
  // Local-first: paints from the cached BookRecord immediately, then
  // hydrates from backend. If backend is unreachable, `offlineMode`
  // flips and the book is marked session-pending until the next manual
  // sync. The library pill reflects this via `sessionPendingIds`.
  const { book, loading, error: fetchError, offlineMode } = useBookRecord(bookId);
  // Separate state for runtime EPUB/render errors surfaced by the WebView.
  const [epubError, setEpubError] = useState<string | null>(null);
  const error = fetchError ?? epubError;
  const { hasFile, markAvailable: setHasFile } = useBookFile(book ?? null);

  // ── Reader storage: per-book bits (last CFI) ──
  const storage = useReaderStorage(book?.filename ?? null);
  const {
    hydrated: storageHydrated,
    lastCfi: storedCfi,
    lastCfiPushed,
    lastReadAt: storedReadAt,
    saveLastCfi,
    markPushed,
  } = storage;

  // Restore anchor — newer wins, mirroring web's ReaderView. The per-file
  // row is written on every page turn on THIS device; the record's
  // `cfi_position` is whatever the backend (or the cached record) last
  // heard. Same device → local; switched device → record. A tie (the
  // back-press writes both with one timestamp) is the same cfi either way.
  // A record with no position at all (just created by a pending push —
  // its `last_read_at` is the row's birth, not a read) can't outrank one.
  const startCfi =
    storedCfi && (!book?.cfi_position || !isNewer(book.last_read_at, storedReadAt))
      ? storedCfi
      : book?.cfi_position ?? null;

  // ── Reader prefs: app-level (font / theme / line height / fontFamily) ──
  const { prefs, savePrefs, hydrated: prefsHydrated } = useReaderPrefs();
  const hydrated = storageHydrated && prefsHydrated;

  // ── EPUB state ──────────────────────────────────────────────────────
  // `bookType` is detected up-front via a lightweight OPF read (see the
  // effect below) — for fixed-layout (manga) books we skip FoliateReader
  // entirely and render MangaScrollView. Reflowable books still go through
  // foliate; FoliateReader's onReady then refines the bookType to 'text'
  // vs 'novel' (vertical-rl JP).
  const [bookType, setBookType] = useState<BookType | null>(null);
  // False until the WebView reports 'ready', which it does only once the book
  // has been put back where the reader left off. Until then the reader is
  // covered -- see the placing frame below.
  // Three independent facts, combined below into one question: may the book
  // be shown yet? Keeping them apart is what lets the floor and the backstop
  // coexist without either having to know about the other.
  const [placedReported, setPlacedReported] = useState(false);  // the book is in position
  const [minHeld, setMinHeld] = useState(false);                // the floor has passed
  const [placingTimedOut, setPlacingTimedOut] = useState(false);// the backstop fired
  // The frame outlives `placed` by the length of its fade: `placed` says the
  // book may be shown, `placingMounted` says the cover is still on top of it.
  // Swapping them in one frame is the "bland transposition" -- the cover has
  // to leave, not be replaced.
  const [placingMounted, setPlacingMounted] = useState(true);
  // One driver, 0 -> 1, with every track interpolated off it. Keeping a single
  // value means the four layers cannot drift out of step, and all four
  // properties (opacity and transform) are native-drivable, so the whole thing
  // leaves the JS thread -- which matters because it plays over the reader's
  // most expensive moment.
  const enter = useRef(new Animated.Value(0)).current;

  // The cover pulls back a touch before it pushes through. That tiny
  // anticipation is most of what makes it read as going INTO the book rather
  // than the cover simply being scaled up and deleted.
  const coverScale = enter.interpolate({
    inputRange: [0, 0.16, 1],
    outputRange: [1, 0.96, 1.7],
  });
  // It holds its ink while it grows, then goes late and fast: a cover that
  // fades evenly just dissolves, where one that stays solid and then vanishes
  // feels like it passed the camera.
  const coverOpacity = enter.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [1, 1, 0],
  });
  // The ground goes FIRST -- earlier than the cover, and fully gone by 0.75 --
  // so the page is already there behind a cover that is still solid. Getting
  // this order the wrong way round (cover clearing first) looks almost right
  // and is completely wrong: the cover dissolves into a blank wall and the
  // book appears afterwards, which is a transition between two screens rather
  // than a passage into one.
  const groundOpacity = enter.interpolate({
    inputRange: [0, 0.2, 0.75],
    outputRange: [1, 1, 0],
  });
  // The spinner is the only part that is not scenery -- it says "waiting", and
  // the moment we are not, it should stop saying it.
  const spinnerOpacity = enter.interpolate({
    inputRange: [0, 0.22],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const [toc, setToc] = useState<EpubTocItem[]>([]);
  // Foliate's `relocate` payload sets all five location fields atomically.
  // Bundling them keeps each page-turn a single setState write.
  const [location, setLocation] = useState({
    cfi: '',
    progress: 0,
    page: 0,
    totalPages: 0,
    /** Which TOC entry the visible page belongs to, so the TOC sheet can mark
     *  it. Foliate reports it on every relocate.
     *
     *  Its sibling `chapterLabel` is deliberately **not** kept: the relocate
     *  payload carries one, but the only thing that would render it is the
     *  chapter eyebrow above the prose — and the prose is drawn inside the
     *  WebView by foliate, so that eyebrow is engine work rather than chrome.
     *  Storing it meanwhile would be state nothing reads. */
    chapterHref: '',
  });
  // `page` / `totalPages` are written by the relocate handler and read by the
  // manga spine handler that derives progress from them; nothing renders them
  // any more (the top bar shows the percentage), so they are not destructured.
  const { progress, chapterHref } = location;
  // Manga prep (handle + error + isManga). The hook owns the detection
  // and spine-prepare effect; the page derives bookType + totalPages + ready
  // from the returned state.
  const manga = useMangaSpine(book ?? null, hasFile);
  const { handle: mangaHandle, error: mangaError } = manga;
  const isManga = bookType === 'manga';

  // Each renderer has its own idea of "the book is ready", and the frame has
  // to ask the one that is actually running.
  //
  // Manga does not go through the WebView at all -- it is unzipped page by page
  // on the RN side and is ready when useMangaSpine hands over a handle. The
  // frame used to be hidden for manga outright, but `isManga` is false until
  // the OPF has been read, so it appeared anyway and then vanished the instant
  // the book was *detected* -- which is the start of the slow part, not the end
  // of it. Hence a loader that let go while the pages were still extracting.
  const contentReady = isManga ? mangaHandle != null : placedReported;
  const placed = placingTimedOut || (contentReady && minHeld);

  // Current spine index as reported by whichever reader is active. Used
  // for the toolbar's page-count and to persist scroll position.
  const currentSpineRef = useRef<number>(0);
  // Manga mode + page direction now live in useReaderLayoutPrefs so they
  // persist across sessions. The toggle handlers below proxy to the hook so
  // the local API stays unchanged for existing consumers.

  // ── Selection / menus ───────────────────────────────────────────────
  // The live text selection, or null. The **only** thing the dock is told is
  // whether this is set (`selected`); the payload stays here, with the
  // callbacks that consume it.
  const [selection, setSelection] = useState<SelectionPayload | null>(null);
  const {
    dictTerm,
    dictSentence,
    openDict,
    setDictTerm,
    flashcardPrefill,
    setFlashcardPrefill,
  } = useReaderModals();

  const epubRef = useRef<FoliateReaderHandle | null>(null);
  const { mangaMode, mangaPageDir, toggleMangaMode, toggleMangaPageDir } =
    useReaderLayoutPrefs();
  const latestLocationRef = useRef<{
    cfi: string;
    progress: number;
    spineIndex: number;
    totalSpineItems: number;
  } | null>(null);
  const lastSyncedRef = useRef<{ cfi: string; progress: number } | null>(null);

  // Seed the session-dedup ref from the persisted `lastCfiPushed` once
  // storage hydrates. Without this, the first AppState transition after
  // a cold reader open would fire a beacon even if the CFI hasn't moved
  // since last session — `lastSyncedRef.current` would be null and the
  // dedup check at the top of `flushProgress` would always fail. Seeding
  // also covers the cross-session case that Sync-now's CFI push already
  // handles, but lets the session-only path stay correct on its own.
  useEffect(() => {
    if (!storageHydrated || lastSyncedRef.current || !lastCfiPushed) return;
    // `progress` isn't persisted alongside `lastCfiPushed`; using the
    // current `book.progress` (or 0) is fine — the dedup compares both
    // and any genuine progress advance triggers a fresh beacon.
    lastSyncedRef.current = { cfi: lastCfiPushed, progress: book?.progress ?? 0 };
  }, [storageHydrated, lastCfiPushed, book?.progress]);

  // ── Style derivation (vertical=true for JP novels) ──────────────────
  // For manga we send the darker shell color as `bg` so the WebView surround
  // (outside the page art) reads as a distinct surface from the reader
  // chrome. Iframe content for FXL is the page itself, so its bg doesn't
  // matter; for text/novel the same value sets the page background.
  const style = useMemo<ReaderThemeStyle>(
    () => ({
      bg: bookType === 'manga' ? MANGA_SHELL_BG[prefs.theme] : READER_THEMES[prefs.theme].bg,
      fg: READER_THEMES[prefs.theme].fg,
      fontFamily: READER_FONT_STACKS[prefs.fontFamily],
      fontPx: prefs.fontPx,
      lineHeight: prefs.lineHeight,
      vertical: bookType === 'novel',
      highlight: HIGHLIGHT_COLORS[prefs.highlight],
    }),
    [prefs, bookType],
  );

  useEffect(() => {
    if (!hasFile || !hydrated || !bookType) return;
    epubRef.current?.setStyle(style);
  }, [style, hasFile, hydrated, bookType]);

  // ── EPUB callbacks ──────────────────────────────────────────────────
  const handleReady = useCallback((payload: ReadyPayload) => {
    setPlacedReported(true);
    setBookType(payload.bookType);
    setToc(payload.toc);
  }, []);

  const handleRelocated = useCallback(
    (loc: RelocatedPayload) => {
      setLocation({
        cfi: loc.cfi,
        progress: loc.progress,
        page: loc.page,
        totalPages: loc.totalPages,
        chapterHref: loc.chapterHref ?? '',
      });
      // For manga (FXL) the spineIndex is one-to-one with the visible page.
      // Track it so toggling into scroll mode lands at the same page.
      currentSpineRef.current = loc.spineIndex;
      latestLocationRef.current = {
        cfi: loc.cfi,
        progress: loc.progress,
        spineIndex: loc.spineIndex,
        totalSpineItems: loc.spineTotal,
      };
      saveLastCfi(loc.cfi);
    },
    [saveLastCfi],
  );

  const handleSelection = useCallback((payload: SelectionPayload) => {
    setSelection(payload);
  }, []);

  // Selection touch feedback. The WebView gesture decides *when* — it is the
  // only thing that knows the band engaged or grew a character — and this
  // decides what that feels like.
  const handleHaptic = useCallback((kind: 'start' | 'tick') => {
    if (kind === 'start') selectionStartFeedback();
    else selectionTickFeedback();
  }, []);

  const handleEpubError = useCallback((message: string) => {
    setEpubError(message);
  }, []);

  // ── Custom menu (dict / card / copy) ────────────────────
  const handleCustomMenu = useCallback(
    ({ key, selectedText, sentence }: CustomMenuEvent) => {
      const term = (selectedText || selection?.text || '').trim();
      if (!term) return;
      if (key === 'copy') {
        Clipboard.setStringAsync(term);
        return;
      }
      if (key === 'dict') {
        openDict(term, sentence);
        return;
      }
      if (key === 'card') {
        // No dictionary entry behind this one — the user went straight from a
        // selection to "Card". Only the front and the sentence it came from
        // are known; the drawer opens for them to fill in the rest.
        setFlashcardPrefill(plainCardDraft(term, sentence));
      }
    },
    // `openDict` and the setter come from `useReaderModals` — stable across
    // renders, so listing them satisfies the rule without adding a re-render
    // path.
    [selection, openDict, setFlashcardPrefill],
  );

  /** Drop the band in the WebView and the payload here, together — they are
   *  one selection and a half-cleared one leaves the dock in its selected
   *  state with nothing selected. */
  const clearSelection = useCallback(() => {
    epubRef.current?.clearSelection();
    setSelection(null);
  }, []);

  /** Run one of the three selection actions and clear the selection. The dock
   *  supplies the key; the payload comes from here, which is what keeps the
   *  dock free of any knowledge of what is selected. */
  const runSelectionAction = useCallback(
    (key: CustomMenuEvent['key']) => {
      if (!selection) return;
      handleCustomMenu({ key, selectedText: selection.text, sentence: selection.sentence });
      clearSelection();
    },
    [selection, handleCustomMenu, clearSelection],
  );

  /** Jump to a TOC href. Named because the dock takes it as a callback rather
   *  than reaching into the reader's ref. */
  const jumpToHref = useCallback((href: string) => {
    epubRef.current?.goTo(href);
  }, []);

  // A kanji result in the lookup sheet. The sheet reports the character and
  // this builds the draft, so the reader stays the one owner of what a card
  // made from a book looks like — same as the word path above it.
  const handleAddFlashcardFromKanji = useCallback(
    (kanji: KanjiInfo) => {
      setFlashcardPrefill(kanjiCardDraft(kanji));
    },
    [setFlashcardPrefill],
  );

  const handleAddFlashcardFromDict = useCallback(
    (details: WordDetails) => {
      // Passing `dictTerm` as the query is what forces the *searched* form onto
      // the front: `preferredHeadword` surfaces an exact kanji/reading match
      // over the entry's `kanji[0]`, which is often a more common variant than
      // what the user actually highlighted.
      //
      // `dictSentence` is the book's own sentence; the entry's example
      // sentences only stand in when the lookup was opened without one.
      setFlashcardPrefill(
        wordCardDraft(details.word, dictTerm ?? undefined, details.sentences, dictSentence),
      );
      // The lookup deliberately stays open behind the card sheet. Closing it
      // here threw away the query, the entry and the scroll position, and the
      // reader who wanted a second card off the same word had to search for
      // it again. `LookupDrawers` owns the stacking that makes this work.
    },
    [dictTerm, dictSentence, setFlashcardPrefill],
  );

  const reduceMotion = useReduceMotion();

  // Fade the cover out, then stop rendering it. Opacity is the one property
  // that can run entirely off the JS thread, which matters here more than
  // usual: the frame lifts at the exact moment the reader is doing its most
  // expensive work, so a JS-driven fade would stutter against it.
  useEffect(() => {
    if (!placed || !placingMounted) return;
    if (reduceMotion) { setPlacingMounted(false); return; }
    const anim = Animated.timing(enter, {
      toValue: 1,
      duration: ENTER_MS,
      easing: DECELERATE,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => { if (finished) setPlacingMounted(false); });
    return () => anim.stop();
  }, [placed, placingMounted, enter, reduceMotion]);

  // The floor. Runs once from mount, so a book that is placed instantly still
  // shows its cover long enough to read as an opening rather than a blink.
  useEffect(() => {
    const t = setTimeout(() => setMinHeld(true), MIN_PLACING_MS);
    return () => clearTimeout(t);
  }, []);

  // The backstop. If 'ready' never arrives (a broken file, a WebView that
  // failed to boot) the reader gets the book rather than a cover forever.
  // Deliberately independent of the floor: this one ignores it.
  useEffect(() => {
    const t = setTimeout(() => setPlacingTimedOut(true), PLACING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  const { user } = useAuth();

  // ── Manga lifecycle wiring ──────────────────────────────────────────
  // useMangaSpine owns detection + spine prep. Once it reports a manga
  // book, set bookType so the WebView path is skipped; once the handle
  // lands, seed totalPages and mark the reader as ready.
  useEffect(() => {
    if (manga.isManga) setBookType('manga');
  }, [manga.isManga]);
  useEffect(() => {
    if (manga.handle) {
      setLocation((l) => ({ ...l, totalPages: manga.handle!.entries.length }));
    }
  }, [manga.handle]);

  const handleMangaScrollSpineChange = useCallback(
    (spineIndex: number) => {
      currentSpineRef.current = spineIndex;
      setLocation((l) => ({
        ...l,
        page: spineIndex + 1,
        progress: l.totalPages > 0 ? Math.round(((spineIndex + 1) / l.totalPages) * 100) : l.progress,
      }));
    },
    [],
  );

  // ── Progress sync: fire-and-forget keepalive push to backend. Dedup
  // against last-sent snapshot so background/foreground/back transitions
  // don't replay the same write. Mirrors web ReaderStateProvider.
  //
  // Skipped entirely when `offlineMode` — the beacon would fail and
  // we'd waste the round-trip. The local cfi is already saved via
  // `saveLastCfi`, and sync-now's reader-state push will send a fresh
  // beacon once connectivity returns.
  const flushProgress = useCallback(() => {
    if (!book?.id) return;
    if (offlineMode) return;
    const latest = latestLocationRef.current;
    if (!latest) return;
    const last = lastSyncedRef.current;
    if (last && last.cfi === latest.cfi && last.progress === latest.progress) return;
    // Claim the slot before the round-trip so a background→foreground→
    // back sequence doesn't send the same snapshot twice.
    lastSyncedRef.current = { cfi: latest.cfi, progress: latest.progress };
    void sendProgressBeacon(book.id, {
      cfiPosition: latest.cfi,
      progress: latest.progress,
      spineIndex: latest.spineIndex,
      totalSpineItems: latest.totalSpineItems,
      lastReadAt: new Date().toISOString(),
    }).then((ok) => {
      if (ok) {
        // Only now does the row say "pushed": sync-now uses this to skip
        // books whose position the server already has, so recording it
        // for a failed beacon would strand the position on this device.
        // The server has this book's full reader state, so any UNSYNCED
        // flag from an earlier offline session is settled too.
        markPushed(latest.cfi, latest.progress);
        void clearSessionPending(book.id);
      } else if (lastSyncedRef.current?.cfi === latest.cfi) {
        // Release the slot so the next flush in this session retries.
        lastSyncedRef.current = null;
      }
    });
  }, [book?.id, offlineMode, markPushed]);

  // Commit the session's latest position locally. Three writes for the
  // same patch:
  //   1. setLocalProgress — in-memory overlay so the current
  //      library-tab render reflects the session immediately.
  //   2. persistLocalProgress — writes through to the AsyncStorage
  //      synced-book cache so on app restart the cached BookRecord
  //      already carries the latest local state. No-op for pending
  //      books (their id isn't in the synced cache).
  //   3. saveProgressSnapshot — writes through to the per-filename
  //      reader-storage row. This is the path that survives an app
  //      restart for GUEST and PENDING books: those have no synced
  //      cache entry, so (2) is a no-op for them. Filename-keyed,
  //      so it also carries over verbatim through guest→account
  //      conversion (the file is the same; only the owner changes).
  // Shared by the back chevron and the AppState "soft close" so a
  // swipe-away leaves the same state behind as a deliberate exit.
  const commitSession = useCallback(() => {
    const latest = latestLocationRef.current;
    if (!book?.id || !book?.filename || !latest) return;
    const lastReadAt = new Date().toISOString();
    const patch = { progress: latest.progress, cfi: latest.cfi, lastReadAt };
    setLocalProgress(book.id, patch);
    void persistLocalProgress(book.id, patch);
    void saveProgressSnapshot(book.filename, latest.progress, lastReadAt);
  }, [book?.id, book?.filename]);

  // AppState background/inactive = "soft close" (mirrors web visibilitychange).
  // Commit locally as well as beaconing so a hard kill (user swipes away
  // the task) leaves the cached record — the reader's restore anchor —
  // at the real position, not just the percentage.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'background' && state !== 'inactive') return;
      flushProgress();
      commitSession();
    });
    return () => sub.remove();
  }, [flushProgress, commitSession]);

  const handleBack = useCallback(() => {
    flushProgress();
    commitSession();
    router.back();
  }, [flushProgress, commitSession, router]);

  // ── Missing-file recovery ───────────────────────────────────────────
  // Delegates the locate-verify-attach flow to the shared helper so the
  // reader, onboarding, and the dedicated import screen all behave
  // identically (and all carry the same anti-clobber guards).
  const handleImportMissingFile = useCallback(async () => {
    if (!book || !user) return;
    const outcome = await locateBookFile(
      { id: book.id, filename: book.filename, title: book.title },
      user.id,
    );
    if (outcome.status === 'attached') {
      setHasFile(true);
    } else if (outcome.status === 'rejected') {
      Alert.alert(outcome.title, outcome.message);
    }
    // 'canceled' → user backed out of the picker; do nothing.
  }, [book, user, setHasFile]);

  // ── Render guards ───────────────────────────────────────────────────
  // `hydrated` is part of the guard because `startCfi` is derived from the
  // per-file row: the PDF shell reads `initialCfi` once on mount, so it
  // must not mount before that row has loaded.
  if (loading || !hydrated) {
    return (
      <View style={styles.root}>
        <ActivityIndicator color={p.muted} />
      </View>
    );
  }

  if (error || !book) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        {/* The same 44pt glass circle the reader's own top bar carries, so the
            way out is in the same place whether the book opened or not. */}
        <View style={styles.errorBar}>
          <IconButton glyph="back" onPress={() => router.back()} accessibilityLabel={t('reader.back')} />
        </View>
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>{error ?? t('reader.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── PDF short-circuit ──────────────────────────────────────────────
  // PDFs are read with the native renderer (react-native-pdf). No foliate and
  // no selection — open + page progress, plus the dock's DICT action, which
  // opens the same lookup sheet the EPUB path uses with an empty query. The
  // two drawers are re-rendered here rather than hoisted above the branch:
  // this return has its own SafeAreaView, and the overlays belong inside it.
  if (book.filename.toLowerCase().endsWith('.pdf')) {
    if (!hasFile) {
      return (
        <SafeAreaView style={styles.root} edges={['top']}>
          <ReaderTopBar title={book.title} progress={progress} onBack={handleBack} />
          <MissingFile onImport={handleImportMissingFile} styles={styles} t={t} />
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <PdfReaderShell
          book={book}
          initialCfi={startCfi}
          onBack={handleBack}
          onPageChange={(snap) => {
            latestLocationRef.current = {
              cfi: snap.cfi,
              progress: snap.progress,
              spineIndex: snap.spineIndex,
              totalSpineItems: snap.totalSpineItems,
            };
          }}
          // Empty string, not null: `null` is the closed state, `''` opens the
          // sheet on its search stage with nothing queried yet.
          onOpenDictionary={() => openDict('')}
        />

        <LookupDrawers
          dictTerm={dictTerm}
          onCloseDict={() => setDictTerm(null)}
          onAddFlashcard={handleAddFlashcardFromDict}
          onAddKanji={handleAddFlashcardFromKanji}
          flashcardPrefill={flashcardPrefill}
          onCloseFlashcard={() => setFlashcardPrefill(null)}
        />
      </SafeAreaView>
    );
  }

  const ready = hasFile && hydrated;

  // Match the safe-area inset bg to the body for manga so there's no seam
  // between the inset (where the top bar sits) and the rounded frame below it.
  const safeBg = isManga ? style.bg : p.bg;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: safeBg }]} edges={['top']}>
      <ReaderTopBar title={book.title} progress={progress} onBack={handleBack} />

      <View style={styles.body}>
        {/* Manga and reflowable text are two separate renderers, mutually
            exclusive. Manga: RN-side MangaScrollView or MangaPagedView (no
            WebView mounted). Reflowable: foliate-js inside FoliateReader's
            WebView. */}
        {isManga ? (
          mangaMode === 'pages' ? (
            <MangaPagedView
              handle={mangaHandle}
              loading={!mangaHandle && !mangaError}
              error={mangaError}
              shellBg={style.bg}
              initialSpineIndex={currentSpineRef.current}
              onSpineChange={handleMangaScrollSpineChange}
              pageDir={mangaPageDir}
            />
          ) : (
            <MangaScrollView
              handle={mangaHandle}
              loading={!mangaHandle && !mangaError}
              error={mangaError}
              shellBg={style.bg}
              initialSpineIndex={currentSpineRef.current}
              onSpineChange={handleMangaScrollSpineChange}
            />
          )
        ) : ready ? (
          <FoliateReader
            ref={epubRef}
            filename={book.filename}
            startCfi={startCfi}
            initialStyle={style}
            bgColor={style.bg}
            onReady={handleReady}
            onRelocated={handleRelocated}
            onSelection={handleSelection}
            onHaptic={handleHaptic}
            onCustomMenu={handleCustomMenu}
            onError={handleEpubError}
          />
        ) : !hasFile ? (
          <MissingFile onImport={handleImportMissingFile} styles={styles} t={t} />
        ) : (
          <View style={styles.missingWrap}>
            <ActivityIndicator color={p.muted} />
          </View>
        )}

        {/* The placing frame.
            Covers the reader between mounting and the book being put back
            where it was left. The WebView withholds its own paint over the
            same window, so without this the reader would be looking at an
            empty rectangle; with it, they are looking at the book they opened.
            Manga is excluded -- it has no stored position to restore and its
            RN renderers paint immediately. */}
        {placingMounted && hasFile && (
          <View pointerEvents={placed ? 'none' : 'auto'} style={styles.placing}>
            {/* The ground. Its own layer rather than a background on the
                container, so it can fall away while the cover is still
                solid -- the cover has to have somewhere to arrive. */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: style.bg, opacity: groundOpacity },
              ]}
            />
            <Animated.View
              style={{ opacity: coverOpacity, transform: [{ scale: coverScale }] }}
            >
              <BookCover
                title={book.title}
                coverColor={book.cover_color}
                filename={book.filename}
                width={132}
                // Without this the cover has a width and no height at all:
                // BookCover only takes a shape from `aspectRatio` or from the
                // image's own dimensions once it loads, and its <Image> is
                // absolutely positioned so it lends the container nothing. The
                // result is a 132px-wide bar of no height -- and it can stay
                // that way, because an unlaid-out image may never fire the
                // onLoad that would have supplied the real ratio. 3/4 is the
                // same fallback the library grid uses, so a book is the same
                // shape here as on its tile; a real cover still overrides it.
                aspectRatio={3 / 4}
              />
            </Animated.View>
            <Animated.View style={{ opacity: spinnerOpacity }}>
              <ActivityIndicator color={p.muted} />
            </Animated.View>
          </View>
        )}
      </View>

      {/* The dock — one cluster for every renderer, and the only chrome the
          reader has besides the top bar.

          The selection actions are *its* word-selected state rather than a menu
          floating over the text: the reader's thumb is already at the bottom of
          the screen, and a popover that tracked the selection covered the
          sentence it came from. Positioning is gone with it; what is left is
          the `selected` boolean.

          Which shortcuts appear is decided by what is handed over — a TOC only
          when the book has one, Configs only where there is something to
          configure — so no renderer needs a variant flag. One dock serves text,
          vertical novel and manga; `TextReader`, `NovelReader` and
          `MangaReader` were three wrappers around three variants of the old one
          and are gone.

          Gated on `bookType` as well as the file, so the cluster does not sit
          on top of the cover while the book is still being placed. */}
      {ready && bookType !== null && (
        <ReaderDock
          theme={prefs.theme}
          selected={selection !== null}
          onDismissSelection={clearSelection}
          onAddCard={() => runSelectionAction('card')}
          onLookUp={() => runSelectionAction('dict')}
          onCopy={() => runSelectionAction('copy')}
          toc={{ items: toc, currentHref: chapterHref || undefined, onNavigate: jumpToHref }}
          configs={{
            prefs,
            onChange: savePrefs,
            manga: isManga
              ? {
                  mode: mangaMode,
                  onToggleMode: toggleMangaMode,
                  pageDir: mangaPageDir,
                  onTogglePageDir: toggleMangaPageDir,
                }
              : undefined,
          }}
          // Empty string, not null: `null` is the closed state, `''` opens the
          // sheet on its search stage with nothing queried yet. This is what
          // makes the dictionary reachable from **every** reader rather than
          // only from a selection or only from the PDF dock.
          onOpenDictionary={() => openDict('')}
        />
      )}

      <LookupDrawers
        dictTerm={dictTerm}
        onCloseDict={() => setDictTerm(null)}
        onAddFlashcard={handleAddFlashcardFromDict}
        onAddKanji={handleAddFlashcardFromKanji}
        flashcardPrefill={flashcardPrefill}
        onCloseFlashcard={() => setFlashcardPrefill(null)}
      />
    </SafeAreaView>
  );
}

/**
 * The cross-device case: the record is on the account, the file is not on this
 * phone. One message and one way to fix it.
 *
 * Extracted because it is rendered from three branches — the PDF short-circuit,
 * the EPUB body, and the EPUB body's own guard — which used to be three copies
 * of the same three elements with the format name swapped. The name is not
 * swapped any more: the picker accepts whatever the book is, so the copy says
 * "file" and stops claiming to know.
 */
function MissingFile({
  onImport,
  styles,
  t,
}: {
  onImport: () => void;
  styles: ReturnType<typeof useStyles>;
  t: (key: string) => string;
}) {
  return (
    <View style={styles.missingWrap}>
      <Text style={styles.missingTitle}>{t('reader.missingTitle')}</Text>
      <Text style={styles.missingBody}>{t('reader.missingBody')}</Text>
      <Button label={t('reader.importFile')} icon="download" onPress={onImport} />
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: p.bg },
        body: { flex: 1 },

        /** The way out, when there is no book to put a top bar on. */
        errorBar: {
          height: 60,
          justifyContent: 'center',
          paddingHorizontal: spacing.screenX,
        },
        errorWrap: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xxl,
        },
        errorTitle: { ...type.bodyMd, color: p.ink, textAlign: 'center' },

        missingWrap: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.lg,
          paddingHorizontal: spacing.xxl,
        },
        missingTitle: { ...type.headlineMd, color: p.ink, textAlign: 'center' },
        missingBody: { ...type.bodySm, color: p.muted, textAlign: 'center' },

        // Sits over the reader body, not the chrome: the top bar stays readable
        // so the book's title and the way out are there the whole time.
        //
        // Centring and nothing else. No offsets, no absolute placement of the
        // children -- whatever this lands on is what plain centring gives,
        // which is the baseline to judge the rest against.
        placing: {
          ...StyleSheet.absoluteFillObject,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [p],
  );
}
