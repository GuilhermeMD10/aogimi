'use client';

import { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';

// Hard gate: phones don't get the web app. The reading + dictionary +
// deck UX targets pointer + desktop-class viewports; on a phone the
// native app is the right surface. We only block phones, not tablets:
// iPad is reported as Macintosh since iPadOS 13, and Android tablets
// don't carry "Mobile" in the UA. The distinction comes from the
// "Mobile" UA token (Android) and the iPhone/iPod literal (iOS).
function detectPhone(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPod/i.test(ua)) return true;
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return true;
  return false;
}

// TODO: drop real URLs in once the apps are listed.
const APP_STORE_URL = '#';
const PLAY_STORE_URL = '#';

export function MobileGate({ children }: { children: React.ReactNode }) {
  // Render children on the server pass — UA detection only happens on
  // the client. Without this guard, hydration would see "phone? false"
  // server-side and possibly "true" client-side, mismatching the tree.
  const [isPhone, setIsPhone] = useState<boolean | null>(null);
  useEffect(() => {
    setIsPhone(detectPhone());
  }, []);

  if (isPhone === null) return <>{children}</>;
  if (!isPhone) return <>{children}</>;

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
          Get Shirube for mobile
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
