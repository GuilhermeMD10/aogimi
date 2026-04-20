'use client';

import { useCallback, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  FolderOpen,
  File,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { importBook } from '@/lib/bookStore';
import { computeEpubIdentity } from '@/lib/epubIdentity';
import { matchBooks, type MatchCandidate } from '@/lib/booksApi';
import { getDeviceId } from '@/lib/deviceId';
import { markBookAvailable } from '@/lib/devicesApi';
import type { DeviceBookRecord } from '@/lib/devicesApi';
import { supportsDirectoryPicker, pickDirectory, scanForEpubs } from '@/lib/fsAccess';

// ── Types ────────────────────────────────────────────────────────────────────

interface MatchedBook {
  remoteId: string;
  title: string;
  matched: boolean;
}

type RestorePhase = 'welcome' | 'matching' | 'done';

// ── Component ────────────────────────────────────────────────────────────────

export default function RestoreLibrary({
  remoteBooks,
  userId,
  onComplete,
  onSkip,
}: {
  remoteBooks: DeviceBookRecord[];
  userId: number;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [phase, setPhase] = useState<RestorePhase>('welcome');
  const [matchedBooks, setMatchedBooks] = useState<MatchedBook[]>(
    () => remoteBooks.map(b => ({ remoteId: b.id, title: b.title, matched: false })),
  );
  const [matchCount, setMatchCount] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [showUnmatched, setShowUnmatched] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deviceId = typeof window !== 'undefined' ? getDeviceId() : '';

  /** Process a list of EPUB files — match them against the user's remote library. */
  const processFiles = useCallback(
    async (files: { name: string; file: File }[]) => {
      setPhase('matching');
      setTotal(files.length);
      setProcessed(0);
      setMatchCount(0);

      // Build match candidates from all files
      const candidates: { file: File; candidate: MatchCandidate }[] = [];
      for (let i = 0; i < files.length; i++) {
        const { name, file } = files[i];
        setProcessed(i + 1);
        try {
          const buf = await file.arrayBuffer();
          const identity = await computeEpubIdentity(buf);
          candidates.push({
            file,
            candidate: {
              file_hash: identity.fileHash,
              content_hash: identity.contentHash,
              metadata: {
                title: '', // will be filled from match
                author: '',
                dc_identifier: identity.dcIdentifier,
                filename: name,
              },
            },
          });
        } catch {
          // Skip unreadable files
        }
      }

      if (candidates.length === 0) {
        setPhase('done');
        return;
      }

      // Batch match against backend
      let results: Awaited<ReturnType<typeof matchBooks>>;
      try {
        results = await matchBooks(
          userId,
          candidates.map(c => c.candidate),
        );
      } catch {
        // If matching fails, try individual imports
        setPhase('done');
        return;
      }

      // Process matches — import matched files locally
      let matched = 0;
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (!result) continue;

        const { file } = candidates[i];
        try {
          await importBook(file, userId);
          await markBookAvailable(deviceId, result.match.id, userId).catch(() => {});
          matched++;
          setMatchCount(matched);

          // Update the matched book in the list
          setMatchedBooks(prev =>
            prev.map(b =>
              b.remoteId === result.match.id ? { ...b, matched: true } : b,
            ),
          );
        } catch {
          // Import failed for this file — skip
        }
      }

      setPhase('done');
    },
    [userId, deviceId],
  );

  /** Pick a folder (FS Access API) and scan for EPUBs */
  const handlePickFolder = useCallback(async () => {
    try {
      const handle = await pickDirectory();
      if (!handle) return;
      const files = await scanForEpubs(handle);
      await processFiles(files.map(f => ({ name: f.name, file: f })));
    } catch {
      // User cancelled or API not available
    }
  }, [processFiles]);

  /** Pick files via regular file input */
  const handlePickFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFilesSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList || fileList.length === 0) return;
      e.target.value = '';

      const files: { name: string; file: File }[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        if (f.name.endsWith('.epub')) {
          files.push({ name: f.name, file: f });
        }
      }
      await processFiles(files);
    },
    [processFiles],
  );

  const unmatchedBooks = matchedBooks.filter(b => !b.matched);

  // ── Welcome phase ─────────────────────────────────────────────────────────
  if (phase === 'welcome') {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-lgc-bg-elev shadow-sm"
               style={{ border: '1px solid var(--lgc-border)' }}>
            <BookOpen size={28} className="text-lgc-accent" />
          </div>
          <h1
            className="mb-2 text-2xl font-medium tracking-tight text-lgc-fg"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Welcome back
          </h1>
          <p className="mb-1 text-[15px] text-lgc-fg-muted">
            Your reading progress is here — {remoteBooks.length} {remoteBooks.length === 1 ? 'book' : 'books'} synced.
          </p>
          <p className="mb-8 text-[13px] text-lgc-fg-subtle">
            Point us to your EPUB files and we&apos;ll match them to your library.
          </p>

          <div className="flex flex-col items-center gap-2.5">
            {supportsDirectoryPicker() && (
              <button
                type="button"
                onClick={handlePickFolder}
                className="flex w-72 items-center justify-center gap-2 rounded-lg bg-lgc-accent px-5 py-3 text-sm font-semibold text-lgc-accent-fg transition hover:opacity-90"
              >
                <FolderOpen size={16} /> Select folder
              </button>
            )}
            <button
              type="button"
              onClick={handlePickFiles}
              className="flex w-72 items-center justify-center gap-2 rounded-lg border border-lgc-border-strong px-5 py-3 text-sm font-medium text-lgc-fg transition hover:bg-lgc-bg-elev"
            >
              <File size={16} /> Select files
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="mt-2 text-[13px] text-lgc-fg-muted transition-colors hover:text-lgc-fg"
            >
              Skip for now
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".epub,application/epub+zip"
            multiple
            onChange={onFilesSelected}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  // ── Matching phase ────────────────────────────────────────────────────────
  if (phase === 'matching') {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-lgc-bg-elev shadow-sm"
               style={{ border: '1px solid var(--lgc-border)' }}>
            <BookOpen size={28} className="text-lgc-accent animate-pulse" />
          </div>
          <h2
            className="mb-2 text-xl font-medium tracking-tight text-lgc-fg"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Matching your files...
          </h2>
          <p className="mb-6 text-[13px] text-lgc-fg-muted">
            Processing {processed} of {total} files — {matchCount} matched so far
          </p>

          {/* Progress bar */}
          <div className="mx-auto mb-6 h-1.5 w-64 overflow-hidden rounded-full bg-lgc-bg-sunken">
            <div
              className="h-full rounded-full bg-lgc-accent transition-all"
              style={{ width: total > 0 ? `${(processed / total) * 100}%` : '0%' }}
            />
          </div>

          {/* Live match list */}
          <div className="mx-auto max-h-48 w-80 overflow-auto rounded-lg border border-lgc-border bg-lgc-bg-elev text-left">
            {matchedBooks.filter(b => b.matched).map(b => (
              <div key={b.remoteId} className="flex items-center gap-2 border-b border-lgc-border px-3 py-2 last:border-b-0">
                <CheckCircle2 size={14} className="shrink-0 text-green-500" />
                <span className="truncate text-[12px] text-lgc-fg">{b.title}</span>
              </div>
            ))}
            {matchedBooks.filter(b => b.matched).length === 0 && (
              <div className="px-3 py-4 text-center text-[11px] text-lgc-fg-subtle">
                Waiting for matches...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Done phase ────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-lgc-bg-elev shadow-sm"
             style={{ border: '1px solid var(--lgc-border)' }}>
          <CheckCircle2 size={28} className="text-green-500" />
        </div>
        <h2
          className="mb-2 text-xl font-medium tracking-tight text-lgc-fg"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {matchCount} of {remoteBooks.length} matched
        </h2>
        <p className="mb-6 text-[13px] text-lgc-fg-muted">
          {matchCount === remoteBooks.length
            ? 'All your books have been restored.'
            : 'Some books couldn\u2019t be matched. You can locate them later from the library.'}
        </p>

        {/* Unmatched books (collapsible) */}
        {unmatchedBooks.length > 0 && (
          <div className="mx-auto mb-6 w-80">
            <button
              type="button"
              onClick={() => setShowUnmatched(prev => !prev)}
              className="flex w-full items-center justify-between rounded-lg border border-lgc-border bg-lgc-bg-elev px-3 py-2 text-[12px] text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken"
            >
              <span className="flex items-center gap-1.5">
                <AlertCircle size={13} />
                {unmatchedBooks.length} unmatched {unmatchedBooks.length === 1 ? 'book' : 'books'}
              </span>
              {showUnmatched ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {showUnmatched && (
              <div className="mt-1 max-h-40 overflow-auto rounded-lg border border-lgc-border bg-lgc-bg-elev text-left">
                {unmatchedBooks.map(b => (
                  <div key={b.remoteId} className="border-b border-lgc-border px-3 py-2 text-[12px] text-lgc-fg-muted last:border-b-0">
                    {b.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onComplete}
          className="rounded-lg bg-lgc-accent px-6 py-2.5 text-sm font-semibold text-lgc-accent-fg transition hover:opacity-90"
        >
          Go to library
        </button>
      </div>
    </div>
  );
}
