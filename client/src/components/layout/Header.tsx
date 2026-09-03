'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/libs/I18nNavigation';
import { LanguageMenu } from '@/components/layout/LanguageMenu';
import { NavDropdown } from '@/components/layout/NavDropdown';
import type { NavMenu } from '@/libs/NavMenu';

type AuthUser = {
  id?: string;
  email?: string;
  displayName?: string | null;
  role?: string;
};

export function Header(props: { locale?: string; menus?: NavMenu }) {
  const t = useTranslations('Header');
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Fetch authentication status on mount and on route changes
  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted) {
          if (data && !data.error && data.id) {
            setUser(data);
          } else {
            setUser(null);
          }
        }
      })
      .catch(() => {
        if (isMounted) setUser(null);
      });

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // `slug` is how a link finds its dropdown. Home, Events and Comedy have
  // none: the first two are not categories, and Comedy is a leaf under
  // Concerts with no children to list.
  const navLinks = [
    { label: t('home'), href: '/', slug: null },
    { label: t('events'), href: '/events', slug: null },
    { label: t('concerts'), href: '/categories/concerts', slug: 'concerts' },
    { label: t('sports'), href: '/categories/sports', slug: 'sports' },
    { label: t('theatre'), href: '/categories/theater', slug: 'theater' },
    { label: t('comedy'), href: '/categories/comedy', slug: null },
  ] as const;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0c0c0e]/90 backdrop-blur-md transition-all duration-300">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-[107px] py-3.5 max-md:px-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center select-none group">
          <Image
            src="/assets/nav_logo.svg"
            alt="TicketLove.net"
            width={210}
            height={46}
            className="h-10 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            priority
          />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            const items = link.slug ? props.menus?.[link.slug] : undefined;

            if (items?.length) {
              return (
                <NavDropdown
                  key={link.href + link.label}
                  label={link.label}
                  href={link.href}
                  items={items}
                  active={active}
                  seeAllLabel={t('see_all_in', { section: link.label })}
                />
              );
            }

            return (
              <Link
                key={link.href + link.label}
                href={link.href}
                className={`relative py-1 text-[14px] transition-colors ${
                  active
                    ? 'font-semibold text-white'
                    : 'font-normal text-[#a1a1a1] hover:text-white'
                }`}
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                {link.label}
                {active && (
                  <span className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-[var(--color-brand)] shadow-[0_0_8px_var(--color-brand)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Header Actions (Language Switcher + Auth) */}
        <div className="hidden items-center gap-4 md:flex">
          {/* Language Toggle Pill */}
          <LanguageMenu />

          {user ? (
            /* Authenticated: View Dashboard */
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-[13px] font-semibold text-white shadow-md transition-all hover:scale-105 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand)] active:scale-95"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              <span>👤</span>
              <span>{t('dashboard')}</span>
            </Link>
          ) : (
            /* Unauthenticated: Sign In & Get Started */
            <>
              <Link
                href="/sign-in"
                className="text-[14px] font-medium text-[#d1d1d1] transition-colors hover:text-white"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                {t('sign_in')}
              </Link>

              <Link
                href="/sign-up"
                className="inline-flex items-center rounded-full bg-[var(--color-brand)] px-5 py-2 text-[13px] font-semibold text-white shadow-md transition-all hover:scale-105 hover:bg-[#d41e37] hover:shadow-[0_0_15px_rgba(234,42,67,0.4)] active:scale-95"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                {t('sign_up')}
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-3 lg:hidden">
          {/* Quick Mobile Language Switcher */}
          <div className="md:hidden">
            <LanguageMenu compact />
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? t('close_menu') : t('open_menu')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
          >
            {mobileMenuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-[#12070a]/95 px-6 py-6 backdrop-blur-xl lg:hidden">
          <nav className="flex flex-col space-y-3">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-2.5 text-[15px] transition-colors ${
                    active
                      ? 'bg-[var(--color-brand)] font-semibold text-white'
                      : 'text-[#a1a1a1] hover:bg-white/5 hover:text-white'
                  }`}
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* Mobile Auth Actions */}
            <div className="mt-4 flex flex-col gap-2.5 border-t border-white/10 pt-4">
              {user ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand)] py-2.5 text-[14px] font-semibold text-white shadow-md transition hover:bg-[#d41e37]"
                >
                  <span>👤</span>
                  <span>{t('dashboard')}</span>
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center rounded-xl border border-white/15 bg-white/5 py-2.5 text-[14px] font-medium text-white transition hover:bg-white/10"
                  >
                    {t('sign_in')}
                  </Link>
                  <Link
                    href="/sign-up"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center rounded-xl bg-[var(--color-brand)] py-2.5 text-[14px] font-semibold text-white shadow-md transition hover:bg-[#d41e37]"
                  >
                    {t('sign_up')}
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
