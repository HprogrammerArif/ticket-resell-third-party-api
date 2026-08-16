import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function DashboardTicketsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'DashboardTickets' });

  return (
    <div className="p-8">
      <h1 className="mb-8 text-[28px] font-semibold text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
        {t('heading')}
      </h1>
      <div className="mb-6 flex gap-4 border-b border-[var(--color-surface-border)]">
        <button type="button" className="border-b-2 border-[var(--color-brand)] pb-3 text-[14px] font-medium text-[var(--color-brand)]">
          {t('tab_upcoming')}
        </button>
        <button type="button" className="pb-3 text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-white">
          {t('tab_past')}
        </button>
      </div>
      <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] p-12 text-center">
        <p className="text-[var(--color-text-muted)]">{t('no_tickets')}</p>
      </div>
    </div>
  );
}
