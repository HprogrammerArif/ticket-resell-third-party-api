import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getUser } from '@/libs/Auth';

export default async function DashboardPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations('Dashboard');
  const user = await getUser();

  return (
    <div className="[&_p]:my-6">
      <h1 className="text-2xl font-bold">
        {t('hello_message', { email: user?.email ?? 'User' })}
      </h1>
      <p className="text-gray-600">{t('alternative_message')}</p>
    </div>
  );
}
