'use client';

import { useCallback, useEffect, useState } from 'react';
import { FolderOpen, X } from 'lucide-react';
import {
  supportsDirectoryPicker,
  getPersistedDirectory,
  queryPermissionState,
  verifyPermission,
} from '@/features/books/lib/fsAccess';

/**
 * Banner shown when a persisted directory handle exists but permission
 * has lapsed (e.g. after browser restart). One click re-grants access.
 */
export default function FsAccessBanner({ onReconnected }: { onReconnected?: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!supportsDirectoryPicker()) return;

    (async () => {
      const handle = await getPersistedDirectory();
      if (!handle) return;
      // Only `'prompt'` is actionable: `'granted'` is already working, and
      // `'denied'` means the reconnect button would be a dead end. `null` is
      // "the API isn't there to ask", same treatment.
      if ((await queryPermissionState(handle)) === 'prompt') setShow(true);
    })();
  }, []);

  const handleReconnect = useCallback(async () => {
    const handle = await getPersistedDirectory();
    if (!handle) return;
    const granted = await verifyPermission(handle);
    if (granted) {
      setShow(false);
      onReconnected?.();
    }
  }, [onReconnected]);

  if (!show) return null;

  return (
    <div className="flex items-center gap-2.5 rounded-(--radius-input) border border-(--paper-bd) bg-(--paper) px-4 py-2.5 font-[family-name:var(--face-ui)] text-[12.5px]">
      <FolderOpen size={14} strokeWidth={1.8} className="shrink-0 text-(--accent)" />
      <span className="flex-1 text-(--soft)">
        Reconnect your library folder for automatic file matching.
      </span>
      <button
        type="button"
        onClick={handleReconnect}
        className="cursor-pointer rounded-(--radius-button) bg-(--btn) px-3 py-1.5 text-[11.5px] font-bold text-(--btn-ink) transition-opacity duration-120 ease-[ease] hover:opacity-90"
      >
        Reconnect
      </button>
      <button
        type="button"
        onClick={() => setShow(false)}
        aria-label="Dismiss"
        className="cursor-pointer text-(--muted) transition-colors duration-120 ease-[ease] hover:text-(--ink)"
      >
        <X size={13} />
      </button>
    </div>
  );
}
