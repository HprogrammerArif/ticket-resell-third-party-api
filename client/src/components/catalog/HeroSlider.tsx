'use client';

import { useState, useEffect, useCallback } from 'react';

const SLIDES = [
  {
    src: '/assets/images/Rectangle 1.svg',
    overlay: 'from-black/80 via-black/40 to-transparent',
    tint: '',
  },
  {
    src: '/assets/images/images2.svg',
    overlay: 'from-black/80 via-black/40 to-transparent',
    tint: '',
  },
  {
    src: '/assets/images/Rectangle 1.svg',
    overlay: 'from-black/85 via-[#3b0a1a]/40 to-transparent',
    tint: 'rgba(59,10,26,0.35)',
  },
  {
    src: '/assets/images/images2.svg',
    overlay: 'from-black/85 via-[#0a1a3b]/40 to-transparent',
    tint: 'rgba(10,26,59,0.35)',
  },
];

const INTERVAL = 5000;

export function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (animating || index === current) return;
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
    goTo((current + 1) % SLIDES.length);
  }, [current, goTo]);

  const goPrev = useCallback(() => {
    goTo((current - 1 + SLIDES.length) % SLIDES.length);
  }, [current, goTo]);

  useEffect(() => {
    const id = setInterval(goNext, INTERVAL);
    return () => clearInterval(id);
  }, [goNext]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Slides */}
      {SLIDES.map((slide, i) => {
        const isActive = i === current;
        const isPrev = i === prev;
        return (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              opacity: isActive ? 1 : isPrev ? 0 : 0,
              zIndex: isActive ? 2 : isPrev ? 1 : 0,
            }}
          >
            {/* Background image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.src}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            {/* Color tint per slide */}
            {slide.tint && (
              <div
                className="absolute inset-0"
                style={{ backgroundColor: slide.tint }}
              />
            )}
            {/* Left-to-right gradient so text stays readable */}
            <div
              className={`absolute inset-0 bg-gradient-to-r ${slide.overlay}`}
            />
          </div>
        );
      })}

      {/* Bottom fade so hero blends into the page */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent" />

      {/* Prev / Next arrows — pointer-events-auto so they are clickable */}
      <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-between px-3">
        <button
          onClick={goPrev}
          aria-label="Previous slide"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/80"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          onClick={goNext}
          aria-label="Next slide"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/80"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Dot indicators */}
      <div className="pointer-events-auto absolute bottom-16 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === current ? '2rem' : '0.5rem',
              backgroundColor:
                i === current ? '#e11d48' : 'rgba(255,255,255,0.4)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
