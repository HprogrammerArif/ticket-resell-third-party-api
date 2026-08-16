import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';
import { DashboardDeleteAccountButton } from '@/components/DashboardDeleteAccountButton';

export default async function DashboardSettingsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'DashboardSettings' });

  return (
    <div className="p-8">
      <h1 className="mb-8 text-[28px] font-semibold text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
        {t('heading')}
      </h1>

      <div className="max-w-[600px] space-y-8">
        {/* Security */}
        <section className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6">
          <h2 className="mb-4 text-[18px] font-semibold text-white">{t('security_section')}</h2>
          <Link
            href="/dashboard/settings/change-password"
            className="flex items-center justify-between text-[14px] text-[var(--color-text-secondary)] hover:text-white"
          >
            <span>{t('change_password_link')}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </section>

        {/* Notifications (UI only) */}
        <section className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6">
          <h2 className="mb-4 text-[18px] font-semibold text-white">{t('notifications_section')}</h2>
          <div className="space-y-4">
            {([
              { key: 'email_notifications' },
              { key: 'price_alerts' },
            ] as const).map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-[14px] text-[var(--color-text-secondary)]">{t(item.key)}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked="false"
                  className="relative h-6 w-11 rounded-full bg-[var(--color-surface-border)] transition-colors"
                >
                  <span className="absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow transition-transform" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6">
          <h2 className="mb-4 text-[18px] font-semibold text-[var(--color-brand)]">{t('danger_section')}</h2>
          <DashboardDeleteAccountButton />
        </section>
      </div>
    </div>
  );
}
