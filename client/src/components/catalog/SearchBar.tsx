'use client';

import { useState } from 'react';
import { useRouter } from '@/libs/I18nNavigation';
import { useTranslations } from 'next-intl';

export function SearchBar(props: {
  defaultKeyword?: string;
  defaultCity?: string;
  defaultDate?: string;
  placeholder?: string;
}) {
  const t = useTranslations('Common');
  const router = useRouter();
  const [keyword, setKeyword] = useState(props.defaultKeyword ?? '');
  const [city, setCity] = useState(props.defaultCity ?? '');
  const [dateFrom, setDateFrom] = useState(props.defaultDate ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.set('keyword', keyword);
    if (city) params.set('city', city);
    if (dateFrom) params.set('dateFrom', dateFrom);
    router.push(`/events?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={props.placeholder ?? t('keyword_placeholder')}
          className="flex-1 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-5 py-3 text-[14px] text-white placeholder:text-[var(--color-text-muted)] outline-none"
        />
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t('city_placeholder')}
          className="w-full rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-5 py-3 text-[14px] text-white placeholder:text-[var(--color-text-muted)] outline-none sm:w-48"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-5 py-3 text-[14px] text-[var(--color-text-muted)] outline-none sm:w-44"
        />
      </div>
      <button
        type="submit"
        className="mt-3 w-full rounded-full bg-[var(--color-brand-muted)] py-3 text-[14px] font-medium text-white transition-colors hover:bg-[var(--color-brand)]"
      >
        {t('search')}
      </button>
    </form>
  );
}
