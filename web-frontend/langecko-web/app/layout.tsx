import type { Metadata } from 'next';
import { Geist_Mono, Noto_Serif, Public_Sans } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ReaderStateProvider } from '@/components/providers/ReaderStateProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

const publicSans = Public_Sans({
  variable: '--font-public-sans',
  subsets: ['latin'],
});

const notoSerif = Noto_Serif({
  variable: '--font-noto-serif',
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Langecko',
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
      data-theme="denim"
      className={`${publicSans.variable} ${notoSerif.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <ThemeProvider>
          <SidebarProvider className="h-full min-h-0 bg-white">
            <Navbar />
            <SidebarInset className="h-full min-h-0">
              <ReaderStateProvider>
                <main className="h-full w-full overflow-auto">
                  {children}
                </main>
              </ReaderStateProvider>
            </SidebarInset>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
