'use client';

import { useState } from 'react';
import { Link } from '@/libs/I18nNavigation';
import { EventCard } from '@/components/catalog/EventCard';
import type { TnEvent } from '@/types/Catalog';

export type CityEventGroup = {
  cityName: string;
  state?: string;
  events: TnEvent[];
};

interface CityEventsTabsProps {
  cityGroups: CityEventGroup[];
  locale: string;
  seeAllLabel?: string;
}

export function CityEventsTabs({
  cityGroups,
  locale,
  seeAllLabel = 'See All Events →',
}: CityEventsTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!cityGroups.length) return null;

  const currentGroup = cityGroups[activeIndex] ?? cityGroups[0];
  if (!currentGroup) return null;
  const activeCityName = currentGroup.cityName;

  return (
    <div>
      {/* City selector pills */}
      <div className="no-scrollbar mb-8 flex items-center gap-2.5 overflow-x-auto pb-2">
        {cityGroups.map((group, idx) => {
          const isActive = idx === activeIndex;
          const label = group.state ? `${group.cityName}, ${group.state}` : group.cityName;

          return (
            <button
              key={group.cityName}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[var(--color-brand)] text-white shadow-lg shadow-[var(--color-brand-subtle)] scale-105'
                  : 'border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:border-white/20 hover:text-white'
              }`}
            >
              <span className="text-base">{isActive ? '📍' : '🏙️'}</span>
              <span>{label}</span>
              {group.events.length > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    isActive ? 'bg-black/30 text-white' : 'bg-white/5 text-[var(--color-text-muted)]'
                  }`}
                >
                  {group.events.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Events Grid for Active City */}
      {currentGroup.events.length > 0 ? (
        <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {currentGroup.events.map((ev) => (
            <EventCard key={ev.id} event={ev} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] py-16 text-center">
          <p className="text-[16px] text-[var(--color-text-muted)]">
            No upcoming events found in {activeCityName} right now.
          </p>
          <Link
            href="/events"
            className="mt-4 inline-block rounded-full bg-[var(--color-brand-muted)] px-6 py-2 text-[14px] font-medium text-white hover:bg-[var(--color-brand)]"
          >
            Explore all cities
          </Link>
        </div>
      )}

      {/* Footer link to view all events in this city */}
      {currentGroup.events.length > 0 && (
        <div className="mt-8 text-center">
          <Link
            href={`/events?city=${encodeURIComponent(activeCityName)}`}
            className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--color-brand)] transition-colors hover:text-white"
          >
            <span>{seeAllLabel} in {activeCityName}</span>
            <span>→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
