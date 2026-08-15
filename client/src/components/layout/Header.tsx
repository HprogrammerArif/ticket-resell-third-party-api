import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';

export async function Header(props: { locale: string }) {
  const t = await getTranslations({ locale: props.locale, namespace: 'Header' });

  const navLinks = [
    { label: t('home'), href: '/' },
    { label: t('sports'), href: '/categories/sports' },
    { label: t('concerts'), href: '/categories/concerts' },
    { label: t('theatre'), href: '/categories/theater' },
    { label: t('gift_cards'), href: '/' },
  ] as const;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-surface-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-[107px] py-4 max-md:px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo-icon.png" alt="" width={54} height={54} priority />
          <span
            className="text-[28px] font-semibold leading-none tracking-[-1.5px] text-white"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            Ticket
            <span className="text-[var(--color-brand)]">L</span>
            ove
            <span className="text-[var(--color-brand)]">.</span>
            net
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              className="text-[14px] font-light text-[var(--color-text-light)] transition-colors hover:font-semibold hover:text-white"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <Link
          href="/sign-up"
          className="hidden rounded-full bg-[var(--color-brand-muted)] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[var(--color-brand)] md:block"
          style={{ fontFamily: 'var(--font-poppins)' }}
        >
          {t('get_started')}
        </Link>

        {/* Mobile hamburger placeholder — no JS needed until Phase 3 */}
        <button
          type="button"
          aria-label="Open menu"
          className="flex flex-col gap-1.5 md:hidden"
        >
          <span className="block h-0.5 w-6 bg-white" />
          <span className="block h-0.5 w-6 bg-white" />
          <span className="block h-0.5 w-6 bg-white" />
        </button>
      </div>
    </header>
  );
}
