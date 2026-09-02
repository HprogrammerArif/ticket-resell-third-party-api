'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/libs/I18nNavigation';
import { AppConfig } from '@/utils/AppConfig';

/**
 * Each locale in its own language, which is the convention for a language
 * picker — someone looking for Spanish is looking for "Español", not "Spanish".
 */
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
};

/**
 * Switches between the site's languages.
 *
 * A menu rather than a toggle. With two languages a toggle was honest — one
 * click, one alternative. With three it becomes a rotation, where reaching
 * French from English means passing through Spanish and reading the page
 * change twice.
 * @param props - `compact` renders the smaller control used in the mobile bar.
 * @returns The language control.
 */
export function LanguageMenu(props: { compact?: boolean }) {
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = (locale: string) => {
    setOpen(false);
    // The query string is carried over so a filtered list or a search result
    // survives the language change.
    const { search } = window.location;
    router.push(`${pathname}${search}`, { locale, scroll: false });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Language: ${LANGUAGE_NAMES[currentLocale] ?? currentLocale}`}
        className={
          props.compact
            ? 'flex h-8 items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 text-[12px] font-semibold text-[#cfcfcf] transition hover:border-white/30 hover:text-white cursor-pointer'
            : 'flex h-8 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 text-[12px] font-semibold text-[#cfcfcf] transition hover:border-white/30 hover:bg-white/10 hover:text-white cursor-pointer'
        }
      >
        <span className="text-[14px]">🌐</span>
        <span>{currentLocale.toUpperCase()}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-[150px] overflow-hidden rounded-xl border border-white/15 bg-[#141418] py-1 shadow-xl shadow-black/40"
        >
          {AppConfig.i18n.locales.map((locale) => (
            <button
              key={locale}
              type="button"
              role="menuitem"
              onClick={() => choose(locale)}
              className={`flex w-full items-center justify-between px-4 py-2 text-left text-[13px] transition cursor-pointer ${
                locale === currentLocale
                  ? 'bg-white/5 text-white'
                  : 'text-[#cfcfcf] hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>{LANGUAGE_NAMES[locale] ?? locale}</span>
              {locale === currentLocale && <span className="text-[var(--color-brand)]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
