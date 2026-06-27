'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { SHORTCUTS, type ShortcutId } from '@/lib/shortcuts/registry';
import { defMatches, isFromEditableTarget } from '@/lib/shortcuts/match';

// Keyboard-shortcut runtime. One `keydown` listener at the app root; the
// registry in `lib/shortcuts/registry.ts` is the source of truth for what
// each combo means. Components subscribe via `useShortcut(id, handler)`.

/** A handler may return `false` to opt out of `preventDefault`. Anything else
 *  (including `undefined`) is treated as "handled" — the provider calls
 *  `preventDefault` + `stopPropagation`. */
type Handler = (e: KeyboardEvent) => boolean | void;

type Ctx = {
  register: (id: ShortcutId, handler: Handler) => () => void;
  cheatsheetOpen: boolean;
  setCheatsheetOpen: (open: boolean) => void;
};

const ShortcutsCtx = createContext<Ctx | null>(null);

const CHEATSHEET_ID: ShortcutId = 'global:show-cheatsheet';

export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
  // One Set of handlers per shortcut id. Multiple subscribers per id is
  // allowed but rare — first registered wins by iteration order.
  const handlersRef = useRef<Map<ShortcutId, Set<Handler>>>(new Map());

  const [cheatsheetOpen, setCheatsheetOpenState] = useState(false);
  const setCheatsheetOpen = useCallback(
    (open: boolean) => setCheatsheetOpenState(open),
    [],
  );

  const register = useCallback((id: ShortcutId, handler: Handler) => {
    const set = handlersRef.current.get(id) ?? new Set<Handler>();
    set.add(handler);
    handlersRef.current.set(id, set);
    return () => {
      const s = handlersRef.current.get(id);
      if (!s) return;
      s.delete(handler);
      if (s.size === 0) handlersRef.current.delete(id);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't fire any shortcut while the user is typing in a field. The
      // cheatsheet toggle is no exception — using `?` while focused on an
      // input is a legitimate question mark.
      if (isFromEditableTarget(e)) return;

      for (const def of SHORTCUTS) {
        if (!defMatches(e, def)) continue;

        // Built-in: the cheatsheet toggle is owned by the provider itself.
        if (def.id === CHEATSHEET_ID) {
          e.preventDefault();
          setCheatsheetOpenState((v) => !v);
          return;
        }

        const handlers = handlersRef.current.get(def.id as ShortcutId);
        if (!handlers || handlers.size === 0) return;

        let handled = false;
        for (const h of handlers) {
          const r = h(e);
          if (r !== false) handled = true;
        }
        if (handled) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <ShortcutsCtx.Provider value={{ register, cheatsheetOpen, setCheatsheetOpen }}>
      {children}
    </ShortcutsCtx.Provider>
  );
}

export function useShortcuts(): Ctx {
  const ctx = useContext(ShortcutsCtx);
  if (!ctx) throw new Error('useShortcuts must be used inside <ShortcutsProvider>');
  return ctx;
}

/**
 * Subscribe a handler to a shortcut id from the registry.
 *
 * The handler is captured in a ref so passing a new closure on every render
 * doesn't tear down / re-register the binding. Pass `enabled = false` to
 * temporarily disable without unmounting (e.g. while a modal is open).
 *
 *   useShortcut('reader:page-next', () => onRightBtn());
 */
export function useShortcut(
  id: ShortcutId,
  handler: Handler,
  enabled: boolean = true,
): void {
  const { register } = useShortcuts();
  const handlerRef = useRef<Handler>(handler);

  // Keep the ref pointing at the latest handler. Doing this in a layout
  // effect (rather than during render) is correct under concurrent rendering:
  // a thrown-away render won't leak a stale handler.
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    return register(id, (e) => handlerRef.current(e));
  }, [id, register, enabled]);
}
