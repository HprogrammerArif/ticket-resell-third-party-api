'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';

type FormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function DashboardChangePasswordForm() {
  const t = useTranslations('DashboardSettings');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    if (data.newPassword !== data.confirmPassword) {
      setStatus('error');
      setErrorMsg(t('password_mismatch'));
      return;
    }
    setStatus('idle');
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
      });
      if (res.ok) {
        setStatus('success');
        reset();
      } else {
        const raw: unknown = await res.json();
        const err = raw as { error?: string };
        setErrorMsg(err.error ?? t('password_error'));
        setStatus('error');
      }
    } catch {
      setErrorMsg(t('password_error'));
      setStatus('error');
    }
  };

  const inputClass = 'w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 text-[15px] text-white outline-none focus:border-[var(--color-brand)]';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-[440px] space-y-4">
      <div>
        <label htmlFor="currentPassword" className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]">
          {t('current_password_label')}
        </label>
        <input id="currentPassword" type="password" autoComplete="current-password" {...register('currentPassword', { required: true })} className={inputClass} />
      </div>

      <div>
        <label htmlFor="newPassword" className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]">
          {t('new_password_label')}
        </label>
        <input id="newPassword" type="password" autoComplete="new-password" {...register('newPassword', { required: true, minLength: { value: 8, message: t('password_hint') } })} className={inputClass} />
        <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{t('password_hint')}</p>
        {errors.newPassword && <p className="mt-0.5 text-[12px] text-[var(--color-brand)]">{errors.newPassword.message}</p>}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]">
          {t('confirm_password_label')}
        </label>
        <input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword', { required: true })} className={inputClass} />
      </div>

      {status === 'success' && <p className="text-[13px] text-green-400">{t('password_success')}</p>}
      {status === 'error' && <p className="text-[13px] text-[var(--color-brand)]">{errorMsg}</p>}

      <button type="submit" disabled={isSubmitting} className="rounded-full bg-[var(--color-brand)] px-8 py-3 text-[15px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50">
        {t('save_password')}
      </button>
    </form>
  );
}
