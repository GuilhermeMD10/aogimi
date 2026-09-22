'use client';

import { useCallback, useEffect, useState } from 'react';
import { FolderOpen, X } from 'lucide-react';
import { Button, PANE } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import {
  supportsDirectoryPicker,
  getPersistedDirectory,
  queryPermissionState,
  verifyPermission,
} from '@/features/books/lib/fsAccess';

/**
 * Banner shown when a persisted directory handle exists but permission has
 * lapsed (e.g. after a browser restart). One click re-grants access. A `.pane`
 * row under the shelf (no handoff — D9).
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
    <div
      className={cn(
        PANE,
        'flex items-center gap-3 rounded-(--radius-control) py-2.5 pr-3 pl-4',
        'font-[family-name:var(--face-ui)] text-[13px] font-medium',
      )}
    >
      <FolderOpen size={15} strokeWidth={2} className="shrink-0 text-(--accent)" aria-hidden />
      <span className="flex-1 text-(--ink-2)">Reconnect your library folder for automatic file matching.</span>
      <Button size="sm" onClick={handleReconnect} className="h-9 px-4 text-[13px]">
        Reconnect
      </Button>
      <button
        type="button"
        onClick={() => setShow(false)}
        aria-label="Dismiss"
        className="flex size-8 cursor-pointer items-center justify-center rounded-full text-(--ink-3) transition-colors duration-120 ease-[ease] hover:text-(--ink)"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
