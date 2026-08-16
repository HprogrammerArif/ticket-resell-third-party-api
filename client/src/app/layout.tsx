import type { Metadata, Viewport } from 'next';
import { Poppins, Plus_Jakarta_Sans } from 'next/font/google';
import { getLocale } from 'next-intl/server';
import '@/styles/global.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-poppins',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  icons: [
    { rel: 'apple-touch-icon', url: '/apple-touch-icon.png' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', url: '/favicon-32x32.png' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', url: '/favicon-16x16.png' },
    { rel: 'icon', url: '/favicon.ico' },
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${poppins.variable} ${plusJakartaSans.variable}`}>
      <body
        className="bg-[var(--color-surface)] text-[var(--color-text-primary)] font-[var(--font-poppins)]"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
