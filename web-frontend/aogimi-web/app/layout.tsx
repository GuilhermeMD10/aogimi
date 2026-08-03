import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { AuthProvider } from '@/features/auth';
import { ThemeProvider, AppShell } from '@/features/app-shell';
import { MobileGate } from '@/features/mobile-gate';

// ── Faces ───────────────────────────────────────────────────────────────────
// Two families, and that's the whole set — picked in the 2026-08 font
// audition, replacing M PLUS 1 + Space Mono. Switzer is the UI face AND the
// mono role's face (the audition judged the app with no mono accents, and
// that whole is what was chosen); Noto Sans JP is the Japanese face.
// ds-tokens.css keeps the three roles separate so re-splitting any of them
// is a one-line change there.
//
// Switzer is a Fontshare (ITF) family, so it self-hosts from app/fonts/ —
// next/font/google doesn't carry it. Neither family ships a 600 cut: keep
// call sites on `font-medium` / `font-bold`; a `font-semibold` gets
// synthesised. Both are on the /credits inventory — keep that in step with
// what loads here.

const switzer = localFont({
  variable: '--font-switzer',
  display: 'swap',
  src: [
    { path: './fonts/Switzer-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Switzer-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/Switzer-700.woff2', weight: '700', style: 'normal' },
  ],
});

const notoSansJp = Noto_Sans_JP({
  variable: '--font-noto-sans-jp',
  subsets: ['latin'],
  weight: ['500', '700'],
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
      className={`${switzer.variable} ${notoSansJp.variable} h-full antialiased`}
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
