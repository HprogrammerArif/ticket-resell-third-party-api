'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/libs/I18nNavigation';

export type HeroSlide = {
  /** Path the browser fetches the image from. */
  src: string;
  /** Alt text, and the banner's title in the admin screen. */
  alt: string;
  /** Where the slide's button goes. Absent on the decorative fallback slides. */
  linkUrl?: string;
  overlay: string;
  tint: string;
};

/**
 * Shown until an administrator uploads a banner.
 *
 * The homepage had these four as its only hero background, so keeping them as
 * the fallback means an empty banner table looks like the site always did
 * rather than like a fault. They carry no link and no button — they are
 * decoration, not campaigns.
 */
const FALLBACK_SLIDES: HeroSlide[] = [
  { src: '/assets/images/Rectangle 1.svg', alt: '', overlay: 'from-black/80 via-black/40 to-transparent', tint: '' },
  { src: '/assets/images/images2.svg', alt: '', overlay: 'from-black/80 via-black/40 to-transparent', tint: '' },
  { src: '/assets/images/Rectangle 1.svg', alt: '', overlay: 'from-black/85 via-[#3b0a1a]/40 to-transparent', tint: 'rgba(59,10,26,0.35)' },
  { src: '/assets/images/images2.svg', alt: '', overlay: 'from-black/85 via-[#0a1a3b]/40 to-transparent', tint: 'rgba(10,26,59,0.35)' },
];

const INTERVAL = 5000;

/**
 * The hero's background slider.
 *
 * When an administrator has uploaded banners these are their artwork, each
 * with the oversized BUY TICKETS button Steven asked for in the lower centre.
 * With none uploaded it falls back to the four decorative images the homepage
 * always used, so the page never looks broken for want of content.
 * The hero's content is passed as children rather than rendered beside this
 * component. The call to action has to know which slide is showing, and that
 * index lives here — putting the button in the background layer instead, where
 * it started, is what left it stranded underneath the search bar.
 * @param props - The uploaded slides, and the hero content to render above them.
 * @returns The slider wrapping its content.
 */
export function HeroSlider(props: { slides?: HeroSlide[]; children?: React.ReactNode }) {
  const t = useTranslations('HeroSlider');
  const slides = props.slides?.length ? props.slides : FALLBACK_SLIDES;

  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (animating || index === current) {
        return;
      }
      setPrev(current);
      setCurrent(index);
      setAnimating(true);
      setTimeout(() => {
        setPrev(null);
        setAnimating(false);
      }, 700);
    },
    [animating, current],
  );

  const goNext = useCallback(() => {
    goTo((current + 1) % slides.length);
  }, [current, goTo, slides.length]);

  const goPrev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length);
  }, [current, goTo, slides.length]);

  useEffect(() => {
    if (paused || slides.length < 2) {
      return;
    }
    // A slider that moves under someone reading it is the usual complaint
    // about this pattern, and this one sits behind the headline.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const id = setInterval(goNext, INTERVAL);
    return () => clearInterval(id);
  }, [goNext, paused, slides.length]);

  const active = slides[current];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {slides.map((slide, i) => {
        const isActive = i === current;
        const isPrev = i === prev;

        // The outgoing slide stays mounted above the rest while it fades, so
        // the incoming one does not appear over a gap. Its opacity is zero
        // either way — the original wrote `isPrev ? 0 : 0`, where both
        // branches were the same.
        let zIndex = 0;
        if (isActive) {
          zIndex = 2;
        } else if (isPrev) {
          zIndex = 1;
        }

        return (
          <div
            key={`${slide.src}-${i}`}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: isActive ? 1 : 0, zIndex }}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              aria-hidden={slide.alt ? undefined : 'true'}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover object-center"
            />

            {slide.tint && (
              <div className="absolute inset-0" style={{ backgroundColor: slide.tint }} />
            )}

            <div className={`absolute inset-0 bg-gradient-to-r ${slide.overlay}`} />
          </div>
        );
      })}

        {/* Bottom fade so the hero blends into the page */}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent" />
      </div>

      {/* The hero's content, above the artwork. The button leads it, standing
          where the old Get Tickets link did — in the flow, so nothing can end
          up behind the search bar. */}
      <div className="relative z-30 mx-auto max-w-[1440px]">
        {active?.linkUrl && (
          <Link
            href={active.linkUrl}
            className="mb-10 inline-block rounded-full bg-[var(--color-brand)] px-12 py-4 text-[18px] font-semibold text-white shadow-xl shadow-black/40 transition-colors hover:bg-[#d41e37] max-sm:px-8 max-sm:py-3 max-sm:text-[15px]"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            {t('buy_tickets')}
          </Link>
        )}
        {props.children}
      </div>

      {slides.length > 1 && (
        <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-between px-3">
          <button
            type="button"
            onClick={goPrev}
            aria-label={t('previous')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/80"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label={t('next')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/80"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {slides.length > 1 && (
        <div className="pointer-events-auto absolute bottom-16 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {slides.map((slide, i) => (
            <button
              key={`dot-${slide.src}-${i}`}
              type="button"
              onClick={() => goTo(i)}
              aria-label={t('go_to', { number: i + 1 })}
              aria-current={i === current}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === current ? '2rem' : '0.5rem',
                backgroundColor: i === current ? '#e11d48' : 'rgba(255,255,255,0.4)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
