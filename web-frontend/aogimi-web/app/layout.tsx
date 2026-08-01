import type { Metadata } from 'next';
import { Geist_Mono, Inter, M_PLUS_1, Source_Serif_4, Space_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/features/auth';
import { ThemeProvider, AppShell } from '@/features/app-shell';
import { MobileGate } from '@/features/mobile-gate';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// ── Redesign faces ──────────────────────────────────────────────────────────
// M PLUS 1 covers Japanese *and* Latin, so it serves as both --font-jp and
// --font-ui today; ds-tokens.css keeps those two roles separate so splitting
// the Japanese face off later is a one-line change there. Only 500 and 700
// ship — the handoff's "one family, two weights" instruction.
//
// The three faces above stay loaded until the last page migrates off --lgc-*,
// so all five ship during the transition.

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
const THEME_INIT = `(function(){try{var t=localStorage.getItem('aogimi-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

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
      suppressHydrationWarning
      className={`${inter.variable} ${sourceSerif.variable} ${geistMono.variable} ${mplus1.variable} ${spaceMono.variable} h-full antialiased`}
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
