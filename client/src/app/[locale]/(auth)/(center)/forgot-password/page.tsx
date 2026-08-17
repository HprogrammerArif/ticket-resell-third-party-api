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
    <div className="w-full max-w-[440px] rounded-3xl border border-white/10 bg-[#121215]/85 p-8 sm:p-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all">
      {/* Icon Emblem */}
      <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-[var(--color-brand)]/30 bg-[var(--color-brand)]/10 text-2xl text-[var(--color-brand)] shadow-[0_0_20px_rgba(234,42,67,0.2)]">
        🔐
      </div>

      <h1
        className="text-[26px] font-bold tracking-tight text-white sm:text-[28px]"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {t('heading')}
      </h1>

      <p className="mt-3 text-[14px] leading-relaxed text-[#9e9e9e]">
        {t('body')}
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/sign-in"
          className="w-full rounded-xl bg-gradient-to-r from-[var(--color-brand)] to-[#d41e37] py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_20px_rgba(234,42,67,0.35)] transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ fontFamily: 'var(--font-poppins)' }}
        >
          {t('back_to_login')} →
        </Link>
      </div>
    </div>
  );
}
