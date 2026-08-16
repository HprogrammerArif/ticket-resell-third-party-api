import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';

type ForgotPasswordPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: ForgotPasswordPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'ForgotPasswordPage' });
  return { title: t('meta_title') };
}

export default async function ForgotPasswordPage(props: ForgotPasswordPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'ForgotPasswordPage' });

  return (
    <div className="w-full max-w-[400px] text-center">
      <h1
        className="mb-4 text-[32px] font-semibold text-white"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {t('heading')}
      </h1>
      <p className="mb-8 text-[var(--color-text-secondary)]">
        {t('body')}
      </p>
      <Link href="/sign-in" className="text-[var(--color-brand)] underline">
        {t('back_to_login')}
      </Link>
    </div>
  );
}
