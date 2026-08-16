'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/libs/I18nNavigation';

type FormData = {
  email: string;
  password: string;
};

export const SignInForm = () => {
  const t = useTranslations('SignIn');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const rawResult: unknown = await response.json();
      const result = rawResult as { error?: string };

      if (!response.ok) {
        setError(result.error ?? t('error_invalid_credentials'));
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
    <div className="w-full max-w-[400px]">
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
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]"
          >
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
          {errors.email && (
            <p className="mt-1 text-[12px] text-[var(--color-brand)]">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]"
          >
            {t('password_label')}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={t('password_placeholder')}
              {...register('password', { required: 'Password is required' })}
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
          {errors.password && (
            <p className="mt-1 text-[12px] text-[var(--color-brand)]">{errors.password.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-[13px] text-[var(--color-brand)] hover:underline"
          >
            {t('forgot_password')}
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 w-full rounded-full border border-white py-3 text-[16px] font-medium text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </span>
          ) : (
            t('submit')
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-[14px] text-[var(--color-text-secondary)]">
        {t('no_account')}{' '}
        <Link href="/sign-up" className="text-white underline">
          {t('sign_up_link')}
        </Link>
      </p>
    </div>
  );
};
