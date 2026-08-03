import type { Metadata } from 'next';
import { M_PLUS_1, Space_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/features/auth';
import { ThemeProvider, AppShell } from '@/features/app-shell';
import { MobileGate } from '@/features/mobile-gate';

// ── Faces ───────────────────────────────────────────────────────────────────
// Two families, and that's the whole set. Inter, Source Serif 4 and Geist Mono
// shipped alongside these until the last screen migrated; they went with the
// `--lgc-*` palette they backed.
//
// M PLUS 1 covers Japanese *and* Latin, so it serves as both --face-jp and
// --face-ui today; ds-tokens.css keeps those two roles separate so splitting
// the Japanese face off later is a one-line change there. Only 500 and 700
// ship — the handoff's "one family, two weights" instruction — so keep call
// sites on `font-medium` / `font-bold`; a `font-semibold` gets synthesised.

const mplus1 = M_PLUS_1({
  variable: '--font-mplus1',
  subsets: ['latin'],
  weight: ['500', '700'],
  display: 'swap',
});

const spaceMono = Space_Mono({
  variable: '--font-space-mono',
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

// Runs during parse, before anything below it is painted, so the chosen theme
// is on <html> from the first frame instead of flashing light then correcting.
// A React effect can't do this — it fires after paint. localStorage is the
// store for now; a `users.theme` column supersedes it later.
//
// It sets the sky hue preset too — a separate axis from the theme, and one that
// has to be pre-paint for the same reason: `data-sky-hue` drives the mastery
// chrome's rank colours in ds-tokens.css, so applying it after paint would flash
// the wrong ramp. (The star map itself is client-measured and never flashes.)
// The id list mirrors `SKY_HUES` in features/sky/lib/palette.ts — inlined rather
// than imported to keep this a plain string, exactly as the theme names are.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('aogimi-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);var h=localStorage.getItem('aogimi-sky-hue');if(['default','ginga','ember','aurora'].indexOf(h)<0){h='default';}document.documentElement.setAttribute('data-sky-hue',h);}catch(e){}})();`;

export const metadata: Metadata = {
  title: 'Aogimi',
  description: 'Japanese reading and vocabulary app',
  manifest: '/manifest.json',
  icons: {
    // Next auto-serves /app/icon.png, /app/apple-icon.png, /app/opengraph-image.png
    // via its file-based convention. Sized PWA/favicon variants ship from /public.
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    other: [
      // Windows tile
      { rel: 'msapplication-TileImage', url: '/mstile-150x150.png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-sky-hue="default"
      suppressHydrationWarning
      className={`${mplus1.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        {/* Deliberately a raw <script>, not next/script: this has to execute
            during parse, and `beforeInteractive` only promises "before
            hydration", which is already too late to stop a flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <MobileGate>
          <ThemeProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </ThemeProvider>
        </MobileGate>
      </body>
    </html>
  );
}
