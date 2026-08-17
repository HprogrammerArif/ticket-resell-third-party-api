import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ForgotPasswordForm } from '@/components/ForgotPasswordForm';

type ForgotPasswordPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(props: ForgotPasswordPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'ForgotPasswordPage' });
  return { title: t('meta_title') };
}

export default async function ForgotPasswordPage(props: ForgotPasswordPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const searchParams = await props.searchParams;
  const token = typeof searchParams.token === 'string' ? searchParams.token : undefined;

  return <ForgotPasswordForm token={token} />;
}
