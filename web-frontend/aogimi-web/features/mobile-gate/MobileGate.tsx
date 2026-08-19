'use client';

import { useSyncExternalStore } from 'react';
import { Smartphone } from 'lucide-react';
import { cn } from '@/lib/util/cn';

// Hard gate: only desktops / laptops get the web app. Everything
// touch-first (phones AND tablets) is redirected to the native app
// stores. Detection layers, cheapest first:
//   1. iPhone / iPod / iPad in the UA — definitive.
//   2. Android in the UA — covers both phones (`Mobile`) and tablets
//      (no `Mobile` token).
//   3. iPadOS 13+ masquerades as Macintosh; the give-away is that real
//      Macs report `maxTouchPoints === 0` (mouse + trackpad only)
//      whereas the iPad reports ≥ 1. The combination of "claims to be
//      Macintosh" + "has touch input" is the canonical iPad sniff.
//   4. Anything else with a real touch screen (Windows tablets,
//      Chromebooks with detachable screens) — `maxTouchPoints > 0`
//      combined with `pointer: coarse` is the heuristic.
function isTabletOrPhone(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPod|iPad/i.test(ua)) return true;
  if (/Android/i.test(ua)) return true;
  const maxTouch = typeof navigator.maxTouchPoints === 'number' ? navigator.maxTouchPoints : 0;
  if (/Macintosh/i.test(ua) && maxTouch > 1) return true;
  if (typeof window !== 'undefined' && window.matchMedia) {
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    if (coarsePointer && maxTouch > 0) return true;
  }
  return false;
}

// The device class is a value read out of `navigator` / `matchMedia` — an
// external store, not React state — so it's read with the hook built for that
// rather than an effect that calls `setState`.
//
// This is what makes the gate hydration-safe. `getServerSnapshot` is what both
// the server render and the hydration pass see, so the tree they build always
// agrees; React then re-reads `getSnapshot` on the client and swaps in the real
// answer. (A mount effect calling `setState` would do the same job but trips
// `react-hooks/set-state-in-effect`.)
//
// `subscribe` is a no-op: a device does not stop being a phone mid-session.
// Rotating or resizing doesn't change any of the four signals, and re-gating a
// user mid-visit would be worse behaviour than not.
const subscribe = () => () => {};
const getServerSnapshot = () => false;

// TODO: drop real URLs in once the apps are listed.
const APP_STORE_URL = '#';
const PLAY_STORE_URL = '#';

export function MobileGate({ children }: { children: React.ReactNode }) {
  const blocked = useSyncExternalStore(subscribe, isTabletOrPhone, getServerSnapshot);

  if (!blocked) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10 font-[family-name:var(--face-ui)]">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-(--radius-card) border border-(--paper-bd) bg-(--paper-tile)">
          <Smartphone size={28} strokeWidth={1.7} className="text-(--accent)" />
        </div>

        <h1 className="mb-2 text-[26px] leading-tight font-bold tracking-[-0.01em] text-(--ink)">
          Get Aogimi for mobile
        </h1>
        <p className="mb-8 text-[15px] leading-snug text-(--soft)">
          The web app is built for laptops and tablets. On your phone, the
          native app gives you the full reader, dictionary, and decks.
        </p>

        {/* Not `Button`: that one is `w-fit` and these are a full-width stacked
            pair, and both are real navigations to an external store rather than
            in-app links, so they stay plain anchors. */}
        <div className="flex flex-col gap-2.5">
          <a
            href={APP_STORE_URL}
            className={cn(STORE_LINK, 'bg-(--btn) text-(--btn-ink) hover:opacity-90')}
          >
            Download on the App Store
          </a>
          <a
            href={PLAY_STORE_URL}
            className={cn(
              STORE_LINK,
              'border border-(--paper-bd) text-(--ink) hover:bg-(--paper-tile)',
            )}
          >
            Get it on Google Play
          </a>
        </div>
      </div>
    </div>
  );
}

const STORE_LINK = cn(
  'rounded-(--radius-button) px-6 py-3 text-[14px] font-bold',
  'transition-[background-color,opacity] duration-120 ease-[ease]',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
);
