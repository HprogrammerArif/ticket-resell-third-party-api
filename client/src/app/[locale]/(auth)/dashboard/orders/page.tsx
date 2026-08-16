import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function DashboardOrdersPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'DashboardOrders' });

  return (
    <div className="p-8">
      <h1 className="mb-8 text-[28px] font-semibold text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
        {t('heading')}
      </h1>
      <div className="overflow-hidden rounded-2xl border border-[var(--color-surface-border)]">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-[var(--color-surface-border)] bg-[var(--color-surface-raised)]">
            <tr>
              {(['col_order_id', 'col_event', 'col_date', 'col_total', 'col_status'] as const).map((col) => (
                <th key={col} className="px-4 py-3 font-medium text-[var(--color-text-secondary)]">
                  {t(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                {t('no_orders')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
