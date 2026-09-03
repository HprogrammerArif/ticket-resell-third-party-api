'use client';

import { useEffect, useRef, useState } from 'react';
import { Link } from '@/libs/I18nNavigation';
import type { NavMenuItem } from '@/libs/NavMenu';

/**
 * A navigation item that opens a menu of its categories.
 *
 * The item itself stays a link. Someone who clicks "Sports" expecting the
 * Sports page gets the Sports page — the menu is a shortcut past it, never a
 * gate in front of it. That also keeps the section reachable when JavaScript
 * has not loaded.
 *
 * Hover opens it, and so does keyboard focus: a menu that only responds to a
 * mouse is unreachable for anyone tabbing through, and Steven's reference —
 * StubHub — opens on both. Escape closes it and returns focus to the item.
 * @param props - The label, its section link, the menu items, and active state.
 * @returns The navigation item with its dropdown.
 */
export function NavDropdown(props: {
  label: string;
  href: string;
  items: NavMenuItem[];
  active: boolean;
  seeAllLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(event) => {
        // Only close when focus has left the whole item, not when it moves
        // between the trigger and the entries inside the menu.
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setOpen(false);
        }
      }}
    >
      <Link
        ref={triggerRef}
        href={props.href}
        aria-haspopup="true"
        aria-expanded={open}
        className={`relative flex items-center gap-1 py-1 text-[14px] transition-colors ${
          props.active
            ? 'font-semibold text-white'
            : 'font-normal text-[#a1a1a1] hover:text-white'
        }`}
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {props.label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          aria-hidden="true"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        {props.active && (
          <span className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-[var(--color-brand)] shadow-[0_0_8px_var(--color-brand)]" />
        )}
      </Link>

      {open && props.items.length > 0 && (
        <div
          className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3"
          // The gap between the item and the panel would otherwise end the
          // hover and close the menu before the pointer arrives.
        >
          <div className="w-[420px] rounded-2xl border border-white/10 bg-[#141418] p-3 shadow-2xl shadow-black/50">
            <div className="grid grid-cols-2 gap-1">
              {props.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-baseline justify-between gap-2 rounded-lg px-3 py-2 text-[13px] text-[#cfcfcf] transition hover:bg-white/5 hover:text-white"
                >
                  <span className="truncate">{item.label}</span>
                  <span className="shrink-0 text-[11px] text-[#6b6b6b]">
                    {item.eventCount.toLocaleString()}
                  </span>
                </Link>
              ))}
            </div>

            <Link
              href={props.href}
              className="mt-2 block rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--color-brand)] transition hover:bg-white/5"
            >
              {props.seeAllLabel}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
