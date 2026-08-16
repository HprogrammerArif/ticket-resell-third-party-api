import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getUser } from '@/libs/Auth';
import { DashboardProfileForm } from '@/components/DashboardProfileForm';

export default async function DashboardProfilePage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'DashboardProfile' });
  const user = await getUser();

  const initials = (user?.displayName ?? user?.email ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="p-8">
      <h1
        className="mb-8 text-[28px] font-semibold text-white"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {t('heading')}
      </h1>

      <div className="max-w-[480px]">
        {/* Avatar */}
        <div className="mb-8 flex items-center gap-4">
          <div
            className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] text-[24px] font-semibold text-white"
            aria-label={t('avatar_alt')}
          >
            {initials}
          </div>
        </div>

        <DashboardProfileForm
          initialDisplayName={user?.displayName ?? ''}
          email={user?.email ?? ''}
        />
      </div>
    </div>
  );
}
