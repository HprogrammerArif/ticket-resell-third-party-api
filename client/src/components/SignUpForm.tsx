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
    watch,
    formState: { errors },
  } = useForm<FormData>({ defaultValues: { marketingConsent: true, gender: '' } });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const selectedGender = watch('gender');

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
    <div className="w-full max-w-[480px] rounded-3xl border border-white/10 bg-[#121215]/85 p-8 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all">
      {/* Header Badge */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-brand)]/30 bg-[var(--color-brand)]/10 px-3.5 py-1 text-[12px] font-semibold text-[var(--color-brand)]">
          <span className="inline-block size-1.5 rounded-full bg-[var(--color-brand)] animate-pulse" />
          <span>{t('badge')}</span>
        </div>
        <h1
          className="text-[26px] font-bold tracking-tight text-white sm:text-[30px]"
          style={{ fontFamily: 'var(--font-poppins)' }}
        >
          {t('heading')}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[#9e9e9e]">
          {t('subheading')}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[var(--color-brand)]/30 bg-[var(--color-brand)]/10 p-3.5 text-[13px] font-medium text-[var(--color-brand)] animate-shake">
          <svg className="size-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name / Profile Name */}
        <div>
          <label htmlFor="displayName" className="mb-1.5 block text-[13px] font-medium text-[#d4d4d4]">
            {t('display_name_label')}
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#737373]">
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <input
              id="displayName"
              type="text"
              autoComplete="name"
              placeholder={t('display_name_placeholder')}
              {...register('displayName')}
              className="w-full rounded-xl border border-white/10 bg-[#1a1a1f] pl-10 pr-4 py-3 text-[14px] text-white placeholder-[#5a5a60] outline-none transition focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]/40"
            />
          </div>
        </div>

        {/* Email Address */}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-[#d4d4d4]">
            {t('email_label')} <span className="text-[var(--color-brand)]">*</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#737373]">
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t('email_placeholder')}
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/iu, message: 'Invalid email address' },
              })}
              className="w-full rounded-xl border border-white/10 bg-[#1a1a1f] pl-10 pr-4 py-3 text-[14px] text-white placeholder-[#5a5a60] outline-none transition focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]/40"
            />
          </div>
          {errors.email && <p className="mt-1 text-[12px] text-[var(--color-brand)]">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-[#d4d4d4]">
            {t('password_label')} <span className="text-[var(--color-brand)]">*</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#737373]">
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('password_placeholder')}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
              })}
              className="w-full rounded-xl border border-white/10 bg-[#1a1a1f] pl-10 pr-11 py-3 text-[14px] text-white placeholder-[#5a5a60] outline-none transition focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]/40"
            />
            <button
              type="button"
              aria-label={showPassword ? t('hide_password') : t('show_password')}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] transition hover:text-white"
            >
              {showPassword ? (
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-[#737373]">{t('password_hint')}</p>
          {errors.password && <p className="mt-0.5 text-[12px] text-[var(--color-brand)]">{errors.password.message}</p>}
        </div>

        {/* Gender (Segmented Pill Buttons) */}
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-[#d4d4d4]">{t('gender_label')}</p>
          <div className="grid grid-cols-3 gap-2">
            {(['FEMALE', 'MALE', 'NON_BINARY'] as const).map((g) => {
              const isSelected = selectedGender === g;
              return (
                <label
                  key={g}
                  className={`flex cursor-pointer items-center justify-center rounded-xl border py-2.5 text-[12px] font-medium transition-all ${
                    isSelected
                      ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/15 text-white shadow-[0_0_12px_rgba(234,42,67,0.25)]'
                      : 'border-white/10 bg-[#1a1a1f] text-[#8e8e93] hover:border-white/20 hover:text-white'
                  }`}
                >
                  <input
                    type="radio"
                    value={g}
                    {...register('gender')}
                    className="sr-only"
                  />
                  <span>{t(`gender_${g.toLowerCase()}` as 'gender_female' | 'gender_male' | 'gender_non_binary')}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Date of Birth */}
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-[#d4d4d4]">{t('dob_label')}</p>
          <div className="grid grid-cols-3 gap-2">
            <select
              {...register('dobMonth')}
              className="rounded-xl border border-white/10 bg-[#1a1a1f] px-3 py-2.5 text-[13px] text-white outline-none transition focus:border-[var(--color-brand)] cursor-pointer"
            >
              <option value="" className="bg-[#141416] text-[#737373]">{t('dob_month')}</option>
              {MONTHS.map((m) => (
                <option key={m} value={m} className="bg-[#141416] text-white">{m}</option>
              ))}
            </select>
            <select
              {...register('dobDay')}
              className="rounded-xl border border-white/10 bg-[#1a1a1f] px-3 py-2.5 text-[13px] text-white outline-none transition focus:border-[var(--color-brand)] cursor-pointer"
            >
              <option value="" className="bg-[#141416] text-[#737373]">{t('dob_day')}</option>
              {days.map((d) => (
                <option key={d} value={d} className="bg-[#141416] text-white">{d}</option>
              ))}
            </select>
            <select
              {...register('dobYear')}
              className="rounded-xl border border-white/10 bg-[#1a1a1f] px-3 py-2.5 text-[13px] text-white outline-none transition focus:border-[var(--color-brand)] cursor-pointer"
            >
              <option value="" className="bg-[#141416] text-[#737373]">{t('dob_year')}</option>
              {years.map((y) => (
                <option key={y} value={y} className="bg-[#141416] text-white">{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Marketing Consent */}
        <label className="flex cursor-pointer items-start gap-2.5 pt-1 select-none">
          <input
            type="checkbox"
            {...register('marketingConsent')}
            className="mt-0.5 size-4 rounded border border-white/20 bg-[#1a1a1f] accent-[var(--color-brand)] cursor-pointer"
          />
          <span className="text-[12px] leading-relaxed text-[#9e9e9e]">{t('marketing_consent')}</span>
        </label>

        {/* Terms */}
        <p className="text-[11px] leading-relaxed text-[#6e6e73]">
          {t('terms_prefix')}{' '}
          <a href="#" className="text-[#a3a3a3] underline hover:text-white">{t('terms_link')}</a>
          {' '}{t('terms_and')}{' '}
          <a href="#" className="text-[#a3a3a3] underline hover:text-white">{t('privacy_link')}</a>.
        </p>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 w-full rounded-xl bg-gradient-to-r from-[var(--color-brand)] to-[#d41e37] py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_20px_rgba(234,42,67,0.35)] transition-all hover:shadow-[0_4px_25px_rgba(234,42,67,0.55)] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          style={{ fontFamily: 'var(--font-poppins)' }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Creating account...</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <span>{t('submit')}</span>
              <span>→</span>
            </span>
          )}
        </button>
      </form>

      {/* Switch to Sign In */}
      <div className="mt-8 border-t border-white/10 pt-6 text-center text-[13px] text-[#9e9e9e]">
        {t('already_have_account')}{' '}
        <Link
          href="/sign-in"
          className="font-semibold text-white transition hover:text-[var(--color-brand)] hover:underline"
        >
          {t('sign_in_link')} →
        </Link>
      </div>
    </div>
  );
};
