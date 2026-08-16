'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/libs/I18nNavigation';

type FormData = {
  displayName: string;
  email: string;
  password: string;
  gender: 'FEMALE' | 'MALE' | 'NON_BINARY' | '';
  dobMonth: string;
  dobDay: string;
  dobYear: string;
  marketingConsent: boolean;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const SignUpForm = () => {
  const t = useTranslations('SignUp');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ defaultValues: { marketingConsent: true, gender: '' } });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);

    let dateOfBirth: string | null = null;
    if (data.dobYear && data.dobMonth && data.dobDay) {
      const monthIndex = MONTHS.indexOf(data.dobMonth);
      if (monthIndex !== -1) {
        dateOfBirth = `${data.dobYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(data.dobDay).padStart(2, '0')}`;
      }
    }

    const payload = {
      email: data.email,
      password: data.password,
      displayName: data.displayName || undefined,
      gender: data.gender || null,
      dateOfBirth,
      marketingConsent: data.marketingConsent,
    };

    try {
      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const rawResult: unknown = await response.json();
      const result = rawResult as { error?: string };

      if (!response.ok) {
        const msg = result.error ?? t('error_generic');
        setError(msg.includes('already exists') ? t('error_email_in_use') : msg);
        setIsLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError(t('error_generic'));
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px]">
      <h1
        className="mb-8 text-[32px] font-semibold text-white"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {t('heading')}
      </h1>

      {error && (
        <div className="mb-4 rounded-lg bg-[var(--color-brand-subtle)] p-3 text-[14px] text-[var(--color-brand)]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Display Name */}
        <div>
          <label htmlFor="displayName" className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]">
            {t('display_name_label')}
          </label>
          <input
            id="displayName"
            type="text"
            autoComplete="name"
            placeholder={t('display_name_placeholder')}
            {...register('displayName')}
            className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-[15px] text-white placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-brand)]"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]">
            {t('email_label')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t('email_placeholder')}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/iu, message: 'Invalid email' },
            })}
            className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-[15px] text-white placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-brand)]"
          />
          {errors.email && <p className="mt-1 text-[12px] text-[var(--color-brand)]">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]">
            {t('password_label')}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('password_placeholder')}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
              })}
              className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-4 py-3 pr-12 text-[15px] text-white placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-brand)]"
            />
            <button
              type="button"
              aria-label={showPassword ? t('hide_password') : t('show_password')}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white"
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{t('password_hint')}</p>
          {errors.password && <p className="mt-0.5 text-[12px] text-[var(--color-brand)]">{errors.password.message}</p>}
        </div>

        {/* Gender (optional) */}
        <div>
          <p className="mb-2 text-[14px] font-medium text-[var(--color-text-secondary)]">{t('gender_label')}</p>
          <div className="flex gap-4">
            {(['FEMALE', 'MALE', 'NON_BINARY'] as const).map((g) => (
              <label key={g} className="flex cursor-pointer items-center gap-2 text-[14px] text-[var(--color-text-secondary)]">
                <input
                  type="radio"
                  value={g}
                  {...register('gender')}
                  className="accent-[var(--color-brand)]"
                />
                {t(`gender_${g.toLowerCase()}` as 'gender_female' | 'gender_male' | 'gender_non_binary')}
              </label>
            ))}
          </div>
        </div>

        {/* Date of Birth (optional) */}
        <div>
          <p className="mb-2 text-[14px] font-medium text-[var(--color-text-secondary)]">{t('dob_label')}</p>
          <div className="grid grid-cols-3 gap-2">
            <select
              {...register('dobMonth')}
              className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-3 py-3 text-[14px] text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-brand)]"
            >
              <option value="">{t('dob_month')}</option>
              {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select
              {...register('dobDay')}
              className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-3 py-3 text-[14px] text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-brand)]"
            >
              <option value="">{t('dob_day')}</option>
              {days.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              {...register('dobYear')}
              className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-3 py-3 text-[14px] text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-brand)]"
            >
              <option value="">{t('dob_year')}</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Marketing consent */}
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            {...register('marketingConsent')}
            className="mt-0.5 size-4 accent-[var(--color-brand)]"
          />
          <span className="text-[13px] text-[var(--color-text-secondary)]">{t('marketing_consent')}</span>
        </label>

        {/* Terms */}
        <p className="text-[12px] text-[var(--color-text-muted)]">
          {t('terms_prefix')}{' '}
          <a href="#" className="text-white underline">{t('terms_link')}</a>
          {' '}{t('terms_and')}{' '}
          <a href="#" className="text-white underline">{t('privacy_link')}</a>.
        </p>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full border border-white py-3 text-[16px] font-medium text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </span>
          ) : (
            t('submit')
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-[14px] text-[var(--color-text-secondary)]">
        {t('already_have_account')}{' '}
        <Link href="/sign-in" className="text-white underline">
          {t('sign_in_link')}
        </Link>
      </p>
    </div>
  );
};
