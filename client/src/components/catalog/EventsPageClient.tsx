'use client';

import { useState } from 'react';
import { EventsFilterSidebar, type EventFilters } from './EventsFilterSidebar';
import { EventsSortBar } from './EventsSortBar';

type City = { id: number; name: string; eventCount: number };

type Props = {
  initialFilters: EventFilters;
  cities: City[];
  totalCount: number;
  currentSort: string;
  currentView: 'grid' | 'list';
  children: React.ReactNode;
};

export function EventsPageClient({
  initialFilters,
  cities,
  totalCount,
  currentSort,
  currentView,
  children,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex gap-8 lg:gap-10 max-lg:flex-col">
      {/* Left sidebar */}
      <div className="w-full lg:w-[290px] shrink-0 lg:sticky lg:top-24 lg:self-start">
        <EventsFilterSidebar
          initialFilters={initialFilters}
          cities={cities}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(prev => !prev)}
        />
      </div>

      {/* Right content area */}
      <div className="min-w-0 flex-1">
        <EventsSortBar
          totalCount={totalCount}
          currentSort={currentSort}
          currentView={currentView}
          activeFilters={initialFilters}
          onToggleFilters={() => setSidebarOpen(prev => !prev)}
        />
        {children}
      </div>
    </div>
  );
}
