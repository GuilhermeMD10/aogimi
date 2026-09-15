// Global network-state singleton + React hook.
//
// Wraps `@react-native-community/netinfo` so the rest of the app can
// ask one question — "are we online right now?" — without each caller
// having to manage its own subscription.
//
// Two surfaces:
//   - `useOnline()` — React hook returning a boolean. Components
//     re-render on transitions.
//   - `subscribeOnlineTransition(cb)` — module-level listener for
//     `offline → online` edges only. Used by the auth context (to
//     re-validate immediately when the network returns) and the
//     auto-push code (to flush pending writes). Returns an unsubscribe
//     function.
//   - `isOnlineNow()` — synchronous read of the current cached state.
//     Used at call sites that want to skip a network round-trip
//     entirely when they know they'd just fail.
//
// On startup `initNetwork()` should be called once (from app/_layout)
// to install the NetInfo subscription. After that everything works
// from the cached state.

import { useEffect, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

let online = true;
let initialised = false;
const reactSubscribers = new Set<(online: boolean) => void>();
const transitionSubscribers = new Set<() => void>();

function deriveOnline(state: NetInfoState, prev: boolean): boolean {
  if (!state.isConnected) return false;
  if (state.isInternetReachable === false) return false;
  if (state.isInternetReachable === true) return true;
  // `null` = the reachability probe hasn't answered yet: no change. At
  // launch that keeps the initial `true`, so the UI isn't gated for the
  // first few seconds. Coming out of airplane mode it keeps `false`, so
  // the offline→online edge fires when the route actually works — not
  // the instant the radio comes up, when the auto-push would only fail.
  return prev;
}

// Idempotent — safe to call from any mount; the RN root layout owns the
// single registration. NetInfo's subscription lives for the lifetime of
// the app, so no unsubscribe handle is returned (the previous unsubscribe
// thunk had no caller and made the contract look more flexible than it is).
export function initNetwork(): void {
  if (initialised) return;
  initialised = true;
  NetInfo.addEventListener((state) => {
    const next = deriveOnline(state, online);
    if (next === online) return;
    const wasOffline = !online;
    online = next;
    for (const cb of reactSubscribers) cb(online);
    if (wasOffline && next) {
      for (const cb of transitionSubscribers) {
        try { cb(); } catch { /* don't let one listener kill the rest */ }
      }
    }
  });
}

export function isOnlineNow(): boolean {
  return online;
}

/**
 * Subscribe a callback that fires only on `offline → online`
 * transitions. Use this for "do something when the network returns"
 * — auto-push, auth re-validate, etc. The callback fires inside the
 * NetInfo listener; keep it light or schedule the heavy work itself.
 */
export function subscribeOnlineTransition(cb: () => void): () => void {
  transitionSubscribers.add(cb);
  return () => { transitionSubscribers.delete(cb); };
}

// React-side surface ────────────────────────────────────────────────

export function useOnline(): boolean {
  const [state, setState] = useState<boolean>(online);
  useEffect(() => {
    setState(online); // sync with the latest cached value on mount
    const cb = (next: boolean) => setState(next);
    reactSubscribers.add(cb);
    return () => { reactSubscribers.delete(cb); };
  }, []);
  return state;
}
