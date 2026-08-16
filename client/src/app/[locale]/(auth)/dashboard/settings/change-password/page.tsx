import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DashboardChangePasswordForm } from '@/components/DashboardChangePasswordForm';

export default async function ChangePasswordPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'DashboardSettings' });

  return (
    <div className="p-8">
      <h1 className="mb-8 text-[28px] font-semibold text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
        {t('change_password_heading')}
      </h1>
      <DashboardChangePasswordForm />
    </div>
  );
}
