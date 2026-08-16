'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/libs/I18nNavigation';

type FormData = { displayName: string };

type DashboardProfileFormProps = {
  initialDisplayName: string;
  email: string;
};

export function DashboardProfileForm(props: DashboardProfileFormProps) {
  const t = useTranslations('DashboardProfile');
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: { displayName: props.initialDisplayName },
  });

  const onSubmit = async (data: FormData) => {
    setStatus('idle');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: data.displayName }),
      });
      if (res.ok) {
        setStatus('success');
        router.refresh();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="displayName" className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]">
          {t('name_label')}
        </label>
        <input
          id="displayName"
          type="text"
          {...register('displayName', { required: true })}
          className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 text-[15px] text-white outline-none focus:border-[var(--color-brand)]"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[14px] font-medium text-[var(--color-text-secondary)]">
          {t('email_label')}
        </label>
        <input
          type="email"
          value={props.email}
          readOnly
          className="w-full cursor-not-allowed rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 text-[15px] text-[var(--color-text-muted)] outline-none"
        />
      </div>

      {status === 'success' && (
        <p className="text-[13px] text-green-400">{t('save_success')}</p>
      )}
      {status === 'error' && (
        <p className="text-[13px] text-[var(--color-brand)]">{t('save_error')}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-[var(--color-brand)] px-8 py-3 text-[15px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {t('save_button')}
      </button>
    </form>
  );
}
