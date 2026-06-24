'use client';

import { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';

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

// TODO: drop real URLs in once the apps are listed.
const APP_STORE_URL = '#';
const PLAY_STORE_URL = '#';

export function MobileGate({ children }: { children: React.ReactNode }) {
  // Render children on the server pass — UA detection only happens on
  // the client. Without this guard, hydration would see "blocked? false"
  // server-side and possibly "true" client-side, mismatching the tree.
  const [blocked, setBlocked] = useState<boolean | null>(null);
  useEffect(() => {
    setBlocked(isTabletOrPhone());
  }, []);

  if (blocked === null) return <>{children}</>;
  if (!blocked) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-lgc-bg px-6 py-10">
      <div className="w-full max-w-sm text-center">
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-lgc-bg-elev shadow-sm"
          style={{ border: '1px solid var(--lgc-border)' }}
        >
          <Smartphone size={28} className="text-lgc-accent" />
        </div>

        <h1 className="mb-2 text-2xl font-medium tracking-tight text-lgc-fg font-display">
          Get Aogimi for mobile
        </h1>
        <p className="mb-8 text-[15px] leading-snug text-lgc-fg-muted">
          The web app is built for laptops and tablets. On your phone, the
          native app gives you the full reader, dictionary, and decks.
        </p>

        <div className="flex flex-col gap-2.5">
          <a
            href={APP_STORE_URL}
            className="rounded-lg bg-lgc-accent px-6 py-3 text-sm font-semibold text-lgc-accent-fg transition hover:opacity-90"
          >
            Download on the App Store
          </a>
          <a
            href={PLAY_STORE_URL}
            className="rounded-lg border border-lgc-border bg-lgc-bg-elev px-6 py-3 text-sm font-semibold text-lgc-fg transition hover:bg-lgc-bg-sunken"
          >
            Get it on Google Play
          </a>
        </div>
      </div>
    </div>
  );
}
