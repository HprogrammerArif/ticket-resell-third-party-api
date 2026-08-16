import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getUser } from '@/libs/Auth';

export default async function DashboardPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'DashboardOverview' });
  const user = await getUser();
  const displayName = user?.displayName ?? user?.email;

  return (
    <div className="p-8">
      <h1
        className="mb-8 text-[28px] font-semibold text-white"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {displayName ? t('greeting', { name: displayName }) : t('greeting_fallback')}
      </h1>

      {/* Best show placeholder */}
      <div className="mb-8 rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6">
        <p className="mb-2 text-[13px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
          {t('best_show')}
        </p>
        <p className="text-[var(--color-text-secondary)]">{t('best_show_empty')}</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        {[
          { label: t('upcoming_shows'), value: '0' },
          { label: t('orders_count'), value: '0' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6"
          >
            <p className="text-[36px] font-semibold text-white">{stat.value}</p>
            <p className="text-[14px] text-[var(--color-text-secondary)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <section className="mb-8">
        <h2 className="mb-4 text-[18px] font-semibold text-white">{t('recent_orders')}</h2>
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6">
          <p className="text-[var(--color-text-muted)]">{t('no_orders')}</p>
        </div>
      </section>

      {/* Recent alerts */}
      <section>
        <h2 className="mb-4 text-[18px] font-semibold text-white">{t('recent_alerts')}</h2>
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-6">
          <p className="text-[var(--color-text-muted)]">{t('no_alerts')}</p>
        </div>
      </section>
    </div>
  );
}
