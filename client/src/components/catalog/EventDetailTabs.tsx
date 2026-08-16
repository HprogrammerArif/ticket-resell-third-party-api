'use client';

import { useState } from 'react';

export type TabId = 'tickets' | 'lineup' | 'venue' | 'faq';

type Tab = {
  id: TabId;
  label: string;
  icon: string;
};

type EventDetailTabsProps = {
  tabs: Tab[];
  children: React.ReactNode[];
};

export function EventDetailTabs({ tabs, children }: EventDetailTabsProps) {
  const [active, setActive] = useState<TabId>(tabs[0]?.id ?? 'tickets');
  const activeIndex = tabs.findIndex((t) => t.id === active);

  return (
    <div>
      {/* Tab bar */}
      <div className="relative mb-8 flex gap-0 border-b border-[var(--color-surface-border)]">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={[
                'relative flex items-center gap-2 px-5 py-3.5 text-[14px] font-medium transition-all duration-200 outline-none',
                isActive
                  ? 'text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
              ].join(' ')}
              aria-selected={isActive}
              role="tab"
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[var(--color-brand)]"
                  style={{ boxShadow: '0 0 8px rgba(234,42,67,0.6)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div role="tabpanel">
        {children[activeIndex] ?? children[0]}
      </div>
    </div>
  );
}
