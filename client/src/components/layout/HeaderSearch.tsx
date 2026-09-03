'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/libs/I18nNavigation';

/**
 * A compact search, always available in the header.
 *
 * Steven asked for the search bar to be on every page rather than only the
 * homepage. This is a single field rather than the homepage's keyword, city and
 * date form: a header is a place to start a search, not to refine one, and the
 * events page it lands on has the full set of filters.
 *
 * Hidden on the homepage, where the hero already carries the larger search a
 * few pixels below. Two search boxes stacked on top of each other would be
 * worse than one, and the homepage does not lack for a way to search.
 * @returns The search field, or nothing on the homepage.
 */
export function HeaderSearch() {
  const t = useTranslations('Common');
  const router = useRouter();
  const pathname = usePathname();
  const [keyword, setKeyword] = useState('');

  if (pathname === '/') {
    return null;
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = keyword.trim();
    if (!trimmed) {
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form onSubmit={submit} className="w-full max-w-md" role="search">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 transition focus-within:border-white/25">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
          className="shrink-0 text-[#8a8a8a]"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={t('search_placeholder_short')}
          aria-label={t('search')}
          className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-[#6b6b6b]"
        />
      </div>
    </form>
  );
}
