import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';

export default async function CenteredLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-x-hidden bg-[#0a0a0c] text-white">
      {/* Ambient background glows */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full opacity-20 blur-[130px]"
        style={{
          background: 'radial-gradient(circle, #EA2A43 0%, rgba(234,42,67,0) 70%)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 right-10 h-[400px] w-[600px] rounded-full opacity-15 blur-[120px]"
        style={{
          background: 'radial-gradient(circle, #ff4466 0%, rgba(234,42,67,0) 70%)',
        }}
        aria-hidden="true"
      />

      {/* Top Navbar */}
      <header className="relative z-10 w-full border-b border-white/5 bg-[#0e0e11]/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 sm:px-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 select-none group">
            <Image
              src="/logo-icon.png"
              alt="TicketLove"
              width={38}
              height={38}
              className="transition-transform group-hover:scale-105"
              priority
            />
            <span
              className="text-[22px] font-bold tracking-tight text-white"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Ticket<span className="text-[var(--color-brand)]">L</span>ove<span className="text-[var(--color-brand)]">.</span>net
            </span>
          </Link>

          {/* Back to Home Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[13px] font-medium text-[#c0c0c0] transition-all hover:border-white/25 hover:bg-white/10 hover:text-white"
          >
            <span>←</span>
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content Card Container */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        {props.children}
      </main>

      {/* Bottom Trust & Security Strip */}
      <footer className="relative z-10 w-full border-t border-white/5 bg-[#0e0e11]/60 py-4 text-center backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-center gap-6 px-4 text-[12px] text-[#7a7a7a]">
          <span className="flex items-center gap-1.5">
            <svg className="size-3.5 text-[var(--color-brand)]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
            </svg>
            256-Bit Bank-Grade SSL Encryption
          </span>
          <span className="hidden sm:inline text-white/10">•</span>
          <span className="flex items-center gap-1.5">
            <svg className="size-3.5 text-[var(--color-brand)]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            100% Buyer Money-Back Guarantee
          </span>
          <span className="hidden sm:inline text-white/10">•</span>
          <span>© {new Date().getFullYear()} TicketLove.net. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
