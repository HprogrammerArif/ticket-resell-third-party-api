'use client';

import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';

interface DragScrollContainerProps {
  children: ReactNode;
  className?: string;
  scrollAmount?: number;
  autoStep?: boolean;
  stepInterval?: number; // ms between each step (e.g. 3000ms)
  stepDistance?: number; // px to advance each step (e.g. 346px)
}

export function DragScrollContainer({
  children,
  className = '',
  scrollAmount = 450,
  autoStep = false,
  stepInterval = 3000,
  stepDistance = 346,
}: DragScrollContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Tracking drag state
  const dragRef = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    hasDragged: false,
  });

  const updateFades = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const canScrollLeft = el.scrollLeft > 10;
    const canScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 10;
    setShowLeftFade(canScrollLeft);
    setShowRightFade(canScrollRight);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    updateFades();
    el.addEventListener('scroll', updateFades, { passive: true });
    window.addEventListener('resize', updateFades);

    return () => {
      el.removeEventListener('scroll', updateFades);
      window.removeEventListener('resize', updateFades);
    };
  }, [updateFades]);

  // Recalculate after children render/mount
  useEffect(() => {
    const timeout = setTimeout(updateFades, 200);
    return () => clearTimeout(timeout);
  }, [children, updateFades]);

  // Smooth automatic stepping timer
  useEffect(() => {
    if (!autoStep) return;

    const timer = setInterval(() => {
      const el = ref.current;
      if (!el || isHovered || dragRef.current.isDown) return;

      const isNearEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 30;
      if (isNearEnd) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: stepDistance, behavior: 'smooth' });
      }
    }, stepInterval);

    return () => {
      clearInterval(timer);
    };
  }, [autoStep, stepInterval, stepDistance, isHovered]);

  // Smooth scroll via arrow buttons
  const scrollBy = (direction: 'left' | 'right') => {
    const el = ref.current;
    if (!el) return;
    const amount = direction === 'left' ? -scrollAmount : scrollAmount;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;

    dragRef.current = {
      isDown: true,
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
      hasDragged: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.isDown) return;
    const el = ref.current;
    if (!el) return;

    const x = e.pageX - el.offsetLeft;
    const walk = x - dragRef.current.startX;

    if (Math.abs(walk) > 5) {
      dragRef.current.hasDragged = true;
      setIsDragging(true);
    }

    if (dragRef.current.hasDragged) {
      el.scrollLeft = dragRef.current.scrollLeft - walk;
    }
  };

  const handleMouseUpOrLeave = () => {
    dragRef.current.isDown = false;
    setTimeout(() => {
      setIsDragging(false);
      dragRef.current.hasDragged = false;
    }, 50);
  };

  // Prevent link navigation if the user was dragging
  const handleClickCapture = (e: React.MouseEvent) => {
    if (dragRef.current.hasDragged) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => {
        setTimeout(() => setIsHovered(false), 2000);
      }}
      className="group relative w-full"
    >
      {/* Left scroll navigation arrow */}
      <button
        type="button"
        onClick={() => scrollBy('left')}
        aria-label="Scroll left"
        className={`absolute -left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#141414]/90 text-white shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-110 hover:border-transparent hover:bg-[var(--color-brand)] active:scale-95 max-md:hidden cursor-pointer ${
          showLeftFade ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Right scroll navigation arrow */}
      <button
        type="button"
        onClick={() => scrollBy('right')}
        aria-label="Scroll right"
        className={`absolute -right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#141414]/90 text-white shadow-2xl backdrop-blur-md transition-all duration-200 hover:scale-110 hover:border-transparent hover:bg-[var(--color-brand)] active:scale-95 max-md:hidden cursor-pointer ${
          showRightFade ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Left fade edge mask */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[var(--color-surface)] to-transparent transition-opacity duration-300 max-md:w-6"
        style={{ opacity: showLeftFade ? 1 : 0 }}
      />
      {/* Right fade edge mask */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[var(--color-surface)] to-transparent transition-opacity duration-300 max-md:w-6"
        style={{ opacity: showRightFade ? 1 : 0 }}
      />

      {/* Scrollable track */}
      <div
        ref={ref}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onClickCapture={handleClickCapture}
        className={`no-scrollbar flex touch-pan-x gap-4 overflow-x-auto py-2 ${
          isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
        } ${className}`}
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </div>
    </div>
  );
}
