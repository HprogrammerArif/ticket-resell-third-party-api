import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { getUser } from '@/libs/Auth';
import { DashboardSidebar } from '@/components/DashboardSidebar';

type DashboardLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: DashboardLayoutProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'DashboardLayout' });
  return { title: t('meta_title'), description: t('meta_description') };
}

export default async function DashboardLayout(props: DashboardLayoutProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) redirect(`/${locale}/sign-in`);

  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '/dashboard';

  return (
    <div className="flex min-h-screen bg-[var(--color-surface)]">
      <DashboardSidebar locale={locale} pathname={pathname} />
      <main className="flex-1 overflow-y-auto">
        {props.children}
      </main>
    </div>
  );
}
