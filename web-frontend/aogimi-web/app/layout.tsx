import type { Metadata } from 'next';
import { Geist_Mono, Inter, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ThemeProvider, THEMES } from '@/components/providers/ThemeProvider';
import { AppShell } from '@/components/AppShell';
import { MobileGate } from '@/components/MobileGate';

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

// Pre-hydration script: synchronously applies the persisted theme to <html>
// before the browser paints, eliminating the flash-of-default-theme. The
// allow-list is generated at build time from the THEMES registry so a new
// theme automatically starts being valid here too.
const VALID_THEMES = JSON.stringify(Object.keys(THEMES));
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('app-theme');var v=${VALID_THEMES};if(t&&v.indexOf(t)>-1)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="default"
      suppressHydrationWarning
      className={`${inter.variable} ${sourceSerif.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="h-full">
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
