import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function DashboardNotificationsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'DashboardNotifications' });

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-[28px] font-semibold text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
          {t('heading')}
        </h1>
        <button type="button" className="text-[14px] text-[var(--color-brand)] hover:underline">
          {t('mark_all_read')}
        </button>
      </div>
      <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-12 text-center">
        <p className="text-[var(--color-text-muted)]">{t('no_notifications')}</p>
      </div>
    </div>
  );
}
