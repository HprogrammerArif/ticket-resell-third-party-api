import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';

type ForgotPasswordPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(_props: ForgotPasswordPageProps): Promise<Metadata> {
  return { title: 'Forgot Password — TicketLove.net' };
}

export default async function ForgotPasswordPage(props: ForgotPasswordPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="w-full max-w-[400px] text-center">
      <h1
        className="mb-4 text-[32px] font-semibold text-white"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        Password Reset
      </h1>
      <p className="mb-8 text-[var(--color-text-secondary)]">
        Password reset is coming soon. Please contact support for assistance.
      </p>
      <Link href="/sign-in" className="text-[var(--color-brand)] underline">
        Back to Log In
      </Link>
    </div>
  );
}
