'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Link } from '@/libs/I18nNavigation';

type RequestFormData = {
  email: string;
};

type ResetFormData = {
  password: string;
  confirmPassword: string;
};

export const ForgotPasswordForm = (props: { token?: string }) => {
  const t = useTranslations('ForgotPasswordPage');

  // States
  const [stage, setStage] = useState<'REQUEST' | 'SENT' | 'RESET' | 'SUCCESS'>(
    props.token ? 'RESET' : 'REQUEST',
  );
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forms
  const {
    register: registerRequest,
    handleSubmit: handleRequestSubmit,
    formState: { errors: requestErrors },
  } = useForm<RequestFormData>();

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    watch: watchReset,
    formState: { errors: resetErrors },
  } = useForm<ResetFormData>();

  const passwordValue = watchReset('password');

  // Submit request reset link
  const onRequestSubmit = async (data: RequestFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });

      const result: unknown = await response.json();
      const resData = result as { error?: string; resetToken?: string };

      if (!response.ok) {
        setError(resData.error ?? t('error_generic'));
        setIsLoading(false);
        return;
      }

      setSubmittedEmail(data.email);
      if (resData.resetToken) {
        setGeneratedToken(resData.resetToken);
      }
      setStage('SENT');
      setIsLoading(false);
    } catch {
      setError(t('error_generic'));
      setIsLoading(false);
    }
  };

  // Submit new password reset
  const onResetSubmit = async (data: ResetFormData) => {
    if (data.password !== data.confirmPassword) {
      setError(t('error_password_mismatch'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: props.token || generatedToken,
          password: data.password,
        }),
      });

      const result: unknown = await response.json();
      const resData = result as { error?: string };

      if (!response.ok) {
        setError(resData.error ?? t('error_generic'));
        setIsLoading(false);
        return;
      }

      setStage('SUCCESS');
      setIsLoading(false);
    } catch {
      setError(t('error_generic'));
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] rounded-3xl border border-white/10 bg-[#121215]/85 p-8 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all">
      {/* ──────────────── STAGE 1: Request Reset Link ──────────────── */}
      {stage === 'REQUEST' && (
        <>
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-brand)]/30 bg-[var(--color-brand)]/10 px-3.5 py-1 text-[12px] font-semibold text-[var(--color-brand)]">
              <span className="inline-block size-1.5 rounded-full bg-[var(--color-brand)] animate-pulse" />
              <span>{t('badge_request')}</span>
            </div>
            <h1
              className="text-[26px] font-bold tracking-tight text-white sm:text-[30px]"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {t('heading_request')}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-[#9e9e9e]">
              {t('subheading_request')}
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[var(--color-brand)]/30 bg-[var(--color-brand)]/10 p-3.5 text-[13px] font-medium text-[var(--color-brand)] animate-shake">
              <svg className="size-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRequestSubmit(onRequestSubmit)} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-[#d4d4d4]">
                {t('email_label')}
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
                  {...registerRequest('email', {
                    required: 'Email is required',
                    pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/iu, message: 'Invalid email address' },
                  })}
                  className="w-full rounded-xl border border-white/10 bg-[#1a1a1f] pl-10 pr-4 py-3 text-[14px] text-white placeholder-[#5a5a60] outline-none transition focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]/40"
                />
              </div>
              {requestErrors.email && (
                <p className="mt-1 text-[12px] text-[var(--color-brand)]">{requestErrors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-[var(--color-brand)] to-[#d41e37] py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_20px_rgba(234,42,67,0.35)] transition-all hover:shadow-[0_4px_25px_rgba(234,42,67,0.55)] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Sending...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <span>{t('submit_request')}</span>
                  <span>→</span>
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-white/10 pt-6 text-center text-[13px] text-[#9e9e9e]">
            <Link
              href="/sign-in"
              className="font-semibold text-white transition hover:text-[var(--color-brand)] hover:underline"
            >
              ← {t('back_to_login')}
            </Link>
          </div>
        </>
      )}

      {/* ──────────────── STAGE 2: Email Sent Confirmation ──────────────── */}
      {stage === 'SENT' && (
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-green-500/30 bg-green-500/10 text-2xl text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
            ✉️
          </div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3.5 py-1 text-[12px] font-semibold text-green-400">
            <span>{t('badge_sent')}</span>
          </div>
          <h2
            className="text-[24px] font-bold text-white sm:text-[28px]"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            {t('heading_sent')}
          </h2>
          <p className="mt-2.5 text-[13px] leading-relaxed text-[#a1a1a1]">
            {t('subheading_sent', { email: submittedEmail })}
          </p>

          {/* Test Link if token returned */}
          {generatedToken && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-[#17171c] p-4 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-brand)]">
                Local Testing / Fast Link:
              </p>
              <button
                type="button"
                onClick={() => setStage('RESET')}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand)]/20 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[var(--color-brand)] cursor-pointer"
              >
                <span>🔑 Open Password Reset Form Directly</span>
                <span>→</span>
              </button>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={() => {
                setStage('REQUEST');
                setError(null);
              }}
              className="text-[13px] text-[#9e9e9e] transition hover:text-white"
            >
              {t('resend_button')}
            </button>
            <Link
              href="/sign-in"
              className="text-[13px] font-semibold text-white transition hover:text-[var(--color-brand)] hover:underline"
            >
              ← {t('back_to_login')}
            </Link>
          </div>
        </div>
      )}

      {/* ──────────────── STAGE 3: Reset Password Form ──────────────── */}
      {stage === 'RESET' && (
        <>
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-brand)]/30 bg-[var(--color-brand)]/10 px-3.5 py-1 text-[12px] font-semibold text-[var(--color-brand)]">
              <span className="inline-block size-1.5 rounded-full bg-[var(--color-brand)] animate-pulse" />
              <span>{t('badge_reset')}</span>
            </div>
            <h1
              className="text-[26px] font-bold tracking-tight text-white sm:text-[30px]"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {t('heading_reset')}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-[#9e9e9e]">
              {t('subheading_reset')}
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[var(--color-brand)]/30 bg-[var(--color-brand)]/10 p-3.5 text-[13px] font-medium text-[var(--color-brand)] animate-shake">
              <svg className="size-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-4">
            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="mb-1.5 block text-[13px] font-medium text-[#d4d4d4]">
                {t('new_password_label')}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#737373]">
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder={t('new_password_placeholder')}
                  {...registerReset('password', {
                    required: 'New password is required',
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
              {resetErrors.password && (
                <p className="mt-0.5 text-[12px] text-[var(--color-brand)]">{resetErrors.password.message}</p>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-[13px] font-medium text-[#d4d4d4]">
                {t('confirm_password_label')}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#737373]">
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder={t('confirm_password_placeholder')}
                  {...registerReset('confirmPassword', {
                    required: 'Please confirm your new password',
                    validate: (val) => val === passwordValue || 'Passwords do not match',
                  })}
                  className="w-full rounded-xl border border-white/10 bg-[#1a1a1f] pl-10 pr-11 py-3 text-[14px] text-white placeholder-[#5a5a60] outline-none transition focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]/40"
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? t('hide_password') : t('show_password')}
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] transition hover:text-white"
                >
                  {showConfirmPassword ? (
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
              {resetErrors.confirmPassword && (
                <p className="mt-1 text-[12px] text-[var(--color-brand)]">{resetErrors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-[var(--color-brand)] to-[#d41e37] py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_20px_rgba(234,42,67,0.35)] transition-all hover:shadow-[0_4px_25px_rgba(234,42,67,0.55)] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Updating...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <span>{t('submit_reset')}</span>
                  <span>→</span>
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-white/10 pt-6 text-center text-[13px] text-[#9e9e9e]">
            <Link
              href="/sign-in"
              className="font-semibold text-white transition hover:text-[var(--color-brand)] hover:underline"
            >
              ← {t('back_to_login')}
            </Link>
          </div>
        </>
      )}

      {/* ──────────────── STAGE 4: Success State ──────────────── */}
      {stage === 'SUCCESS' && (
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-green-500/30 bg-green-500/10 text-2xl text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
            ✓
          </div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3.5 py-1 text-[12px] font-semibold text-green-400">
            <span>{t('badge_success')}</span>
          </div>
          <h2
            className="text-[24px] font-bold text-white sm:text-[28px]"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            {t('heading_success')}
          </h2>
          <p className="mt-2.5 text-[13px] leading-relaxed text-[#a1a1a1]">
            {t('subheading_success')}
          </p>

          <div className="mt-8">
            <Link
              href="/sign-in"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-brand)] to-[#d41e37] py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_20px_rgba(234,42,67,0.35)] transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              <span>{t('sign_in_now')}</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
