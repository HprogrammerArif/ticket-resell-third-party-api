'use client';

import { useState } from 'react';
import Image from 'next/image';
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
    <div className="w-full max-w-[440px] mx-auto px-4 py-2 sm:py-6 flex flex-col items-center">
      {/* Centered TicketLove Brand Logo */}
      <div className="mb-4">
        <Link href="/" className="inline-block transition-transform hover:scale-105">
          <Image
            src="/assets/logo_signin.svg"
            alt="TicketLove.net"
            width={240}
            height={52}
            className="h-11 w-auto object-contain"
            priority
          />
        </Link>
      </div>

      {/* Heading */}
      <h1
        className="text-[28px] sm:text-[32px] font-semibold text-white text-center mb-8"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {t('heading')}
      </h1>

      {/* Google Sign Up Button */}
      <button
        type="button"
        onClick={() => {
          // Future OAuth entry
        }}
        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-[#f2f2f2] text-[#111111] font-medium py-3 px-5 rounded-full transition-all duration-200 shadow-sm cursor-pointer text-[15px]"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>{t('google_signup')}</span>
      </button>

      {/* OR Divider */}
      <div className="w-full flex items-center my-7">
        <div className="flex-1 border-t border-[#26262a]" />
        <span className="px-4 text-[13px] font-semibold uppercase tracking-wider text-[#888888]">
          {t('or_divider')}
        </span>
        <div className="flex-1 border-t border-[#26262a]" />
      </div>

      {/* Error Message */}
      {error && (
        <div className="w-full mb-5 flex items-center gap-2.5 rounded-xl border border-[var(--color-brand)]/30 bg-[var(--color-brand)]/10 p-3.5 text-[13px] font-medium text-[var(--color-brand)] animate-shake">
          <svg className="size-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
        {/* Full Name */}
        <div>
          <label htmlFor="displayName" className="mb-1.5 block text-[14px] font-normal text-[#cfcfcf]">
            {t('display_name_label')}
          </label>
          <input
            id="displayName"
            type="text"
            autoComplete="name"
            placeholder={t('display_name_placeholder')}
            {...register('displayName')}
            className="w-full rounded-xl border border-[#26262a] bg-[#111113] px-4 py-3.5 text-[14px] text-white placeholder-[#505055] outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/20"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[14px] font-normal text-[#cfcfcf]">
            {t('email_label')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t('email_placeholder')}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/iu, message: 'Invalid email address' },
            })}
            className="w-full rounded-xl border border-[#26262a] bg-[#111113] px-4 py-3.5 text-[14px] text-white placeholder-[#505055] outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/20"
          />
          {errors.email && <p className="mt-1 text-[12px] text-[var(--color-brand)]">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-[14px] font-normal text-[#cfcfcf]">
              {t('password_label')}
            </label>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="flex items-center gap-1.5 text-[13px] text-[#777777] transition hover:text-white cursor-pointer"
            >
              {showPassword ? (
                <>
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                  <span>{t('hide_password')}</span>
                </>
              ) : (
                <>
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>{t('show_password')}</span>
                </>
              )}
            </button>
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
            className="w-full rounded-xl border border-[#26262a] bg-[#111113] px-4 py-3.5 text-[14px] text-white placeholder-[#505055] outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/20"
          />
          <p className="mt-1 text-[11px] text-[#737373]">{t('password_hint')}</p>
          {errors.password && <p className="mt-0.5 text-[12px] text-[var(--color-brand)]">{errors.password.message}</p>}
        </div>

        {/* Gender (Segmented Pill Buttons) */}
        <div>
          <p className="mb-1.5 text-[14px] font-normal text-[#cfcfcf]">{t('gender_label')}</p>
          <div className="grid grid-cols-3 gap-2">
            {(['FEMALE', 'MALE', 'NON_BINARY'] as const).map((g) => {
              const isSelected = selectedGender === g;
              return (
                <label
                  key={g}
                  className={`flex cursor-pointer items-center justify-center rounded-xl border py-2.5 text-[13px] font-medium transition-all ${
                    isSelected
                      ? 'border-white/40 bg-white/10 text-white shadow-sm'
                      : 'border-[#26262a] bg-[#111113] text-[#8e8e93] hover:border-white/20 hover:text-white'
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
          <p className="mb-1.5 text-[14px] font-normal text-[#cfcfcf]">{t('dob_label')}</p>
          <div className="grid grid-cols-3 gap-2">
            <select
              {...register('dobMonth')}
              className="rounded-xl border border-[#26262a] bg-[#111113] px-3 py-2.5 text-[13px] text-white outline-none transition focus:border-white/40 cursor-pointer"
            >
              <option value="" className="bg-[#141416] text-[#737373]">{t('dob_month')}</option>
              {MONTHS.map((m) => (
                <option key={m} value={m} className="bg-[#141416] text-white">{m}</option>
              ))}
            </select>
            <select
              {...register('dobDay')}
              className="rounded-xl border border-[#26262a] bg-[#111113] px-3 py-2.5 text-[13px] text-white outline-none transition focus:border-white/40 cursor-pointer"
            >
              <option value="" className="bg-[#141416] text-[#737373]">{t('dob_day')}</option>
              {days.map((d) => (
                <option key={d} value={d} className="bg-[#141416] text-white">{d}</option>
              ))}
            </select>
            <select
              {...register('dobYear')}
              className="rounded-xl border border-[#26262a] bg-[#111113] px-3 py-2.5 text-[13px] text-white outline-none transition focus:border-white/40 cursor-pointer"
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
            className="mt-0.5 size-4 rounded border border-[#333338] bg-[#111113] accent-[var(--color-brand)] cursor-pointer"
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

        {/* Submit Pill Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="mt-6 w-full rounded-full border border-[#2a2a2e] bg-[#141416] py-3.5 text-[15px] font-semibold text-white transition-all hover:border-white/40 hover:bg-[#1c1c20] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer text-center flex items-center justify-center shadow-sm"
          style={{ fontFamily: 'var(--font-poppins)' }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Creating account...</span>
            </span>
          ) : (
            t('submit')
          )}
        </button>
      </form>

      {/* Switch to Sign In */}
      <div className="mt-6 text-center text-[13px] text-[#888888]">
        <span>{t('already_have_account')} </span>
        <Link
          href="/sign-in"
          className="font-medium text-[var(--color-brand)] underline transition hover:text-[#ff4d66]"
        >
          {t('sign_in_link')}
        </Link>
      </div>
    </div>
  );
};
