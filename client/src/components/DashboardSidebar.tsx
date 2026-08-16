import { getTranslations } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';
import { SignOutButton } from '@/components/SignOutButton';

type NavItem = {
  href: string;
  labelKey: 'nav_overview' | 'nav_profile' | 'nav_orders' | 'nav_tickets' | 'nav_notifications' | 'nav_settings';
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    labelKey: 'nav_overview',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: '/dashboard/profile',
    labelKey: 'nav_profile',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: '/dashboard/orders',
    labelKey: 'nav_orders',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    href: '/dashboard/tickets',
    labelKey: 'nav_tickets',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 0 0-2 2v3a2 2 0 1 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 1 1 0-4V7a2 2 0 0 0-2-2H5z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/notifications',
    labelKey: 'nav_notifications',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    href: '/dashboard/settings',
    labelKey: 'nav_settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

type DashboardSidebarProps = {
  locale: string;
  pathname: string;
};

export async function DashboardSidebar(props: DashboardSidebarProps) {
  const t = await getTranslations({ locale: props.locale, namespace: 'DashboardLayout' });

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[var(--color-surface-border)] bg-[#111111]">
      {/* Logo */}
      <div className="px-6 py-6">
        <Link href="/" className="text-[20px] font-bold text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
          Ticket<span className="text-[var(--color-brand)]">Love</span>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-2" aria-label="Dashboard navigation">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = props.pathname === item.href || (item.href !== '/dashboard' && props.pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] hover:text-white'
                  }`}
                >
                  {item.icon}
                  {t(item.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="border-t border-[var(--color-surface-border)] px-3 py-4">
        <SignOutButton>
          <span className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] hover:text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t('sign_out')}
          </span>
        </SignOutButton>
      </div>
    </aside>
  );
}
