'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/libs/I18nNavigation';

export type Banner = {
  id: string;
  title: string;
  filename: string;
  linkUrl: string;
  width: number;
  height: number;
};

const ADVANCE_MS = 6000;

/**
 * The scrolling homepage banners.
 *
 * Steven uploads these from the admin dashboard, so the component knows
 * nothing about what they contain — only how to show them in order.
 *
 * Autoplay stops on hover and on keyboard focus, and never starts at all when
 * the visitor has asked for reduced motion. A carousel that moves under
 * someone mid-sentence is the most common complaint about this pattern, and
 * `prefers-reduced-motion` exists precisely for people who find it painful.
 * @param props - The banners to show, already ordered by the server.
 * @returns The carousel, or null when there are none.
 */
export function BannerCarousel(props: { banners: Banner[] }) {
  const t = useTranslations('BannerCarousel');
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = props.banners.length;
  const show = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) {
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (count === 0) {
    return null;
  }

  const current = props.banners[index];
  if (!current) {
    return null;
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t('label')}
      className="relative mx-auto mb-10 max-w-[1440px] px-[107px] max-md:px-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative overflow-hidden rounded-3xl border border-[var(--color-surface-border)]">
        <Link href={current.linkUrl} className="block">
          <Image
            src={`/api/banners/file/${current.filename}`}
            alt={current.title}
            width={current.width || 1440}
            height={current.height || 480}
            priority={index === 0}
            className="h-auto w-full object-cover"
            sizes="(max-width: 768px) 100vw, 1226px"
          />

          {/* Steven's note: one oversized BUY TICKETS button, lower centre. */}
          <span className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-brand)] px-10 py-4 text-[16px] font-semibold text-white shadow-lg shadow-black/30 transition-colors hover:bg-[#d41e37] max-sm:bottom-4 max-sm:px-6 max-sm:py-2.5 max-sm:text-[13px]">
            {t('buy_tickets')}
          </span>
        </Link>
      </div>

      {count > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {props.banners.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              onClick={() => show(i)}
              aria-label={t('go_to', { number: i + 1 })}
              aria-current={i === index}
              className={`h-2 rounded-full transition-all ${
                i === index ? 'w-8 bg-[var(--color-brand)]' : 'w-2 bg-white/25 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
