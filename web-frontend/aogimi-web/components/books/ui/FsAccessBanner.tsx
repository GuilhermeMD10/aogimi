'use client';

import { useCallback, useEffect, useState } from 'react';
import { FolderOpen, X } from 'lucide-react';
import {
  supportsDirectoryPicker,
  getPersistedDirectory,
  verifyPermission,
} from '@/lib/fsAccess';

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
      // Check if we already have permission
      try {
        const opts = { mode: 'read' as const };
        const state = await (handle as any).queryPermission(opts);
        if (state === 'prompt') setShow(true);
        // 'granted' → already good, 'denied' → don't show either
      } catch {
        // API not available
      }
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
    <div className="flex items-center gap-2.5 rounded-lg border border-lgc-border bg-lgc-bg-elev px-4 py-2.5 text-[12px]">
      <FolderOpen size={14} className="shrink-0 text-lgc-accent" />
      <span className="flex-1 text-lgc-fg-muted">
        Reconnect your library folder for automatic file matching.
      </span>
      <button
        type="button"
        onClick={handleReconnect}
        className="rounded-md bg-lgc-accent px-3 py-1 text-[11px] font-semibold text-lgc-accent-fg transition hover:opacity-90"
      >
        Reconnect
      </button>
      <button
        type="button"
        onClick={() => setShow(false)}
        className="text-lgc-fg-muted transition-colors hover:text-lgc-fg"
      >
        <X size={13} />
      </button>
    </div>
  );
}
