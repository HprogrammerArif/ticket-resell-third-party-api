'use client';

export function TabNav(props: {
  tabs: Array<{ key: string; label: string }>;
  activeKey: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-0 border-b border-[var(--color-surface-border)]">
      {props.tabs.map((tab) => {
        const isActive = tab.key === props.activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => props.onChange(tab.key)}
            className={[
              'px-5 py-3 text-[14px] font-medium transition-colors',
              isActive
                ? 'border-b-2 border-[var(--color-brand)] text-white'
                : 'text-[var(--color-text-secondary)] hover:text-white',
            ].join(' ')}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
