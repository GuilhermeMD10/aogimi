import type { Metadata } from 'next';
import {
  Cormorant_Garamond,
  DM_Mono,
  Geist_Mono,
  Inter,
  Shippori_Mincho,
  Source_Serif_4,
} from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AppShell } from '@/components/AppShell';

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

// Stamp theme fonts — Editorial Mincho pairing.
const shipporiMincho = Shippori_Mincho({
  variable: '--font-shippori-mincho',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Langeco',
  description: 'Japanese reading and vocabulary app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="default"
      className={`${inter.variable} ${sourceSerif.variable} ${geistMono.variable} ${shipporiMincho.variable} ${cormorant.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <ThemeProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
