'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/libs/I18nNavigation';

export function DashboardDeleteAccountButton() {
  const t = useTranslations('DashboardSettings');
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/account', { method: 'DELETE' });
      if (res.ok) {
        router.push('/sign-in');
        router.refresh();
      } else {
        setError(t('delete_error'));
        setIsDeleting(false);
      }
    } catch {
      setError(t('delete_error'));
      setIsDeleting(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="rounded-2xl border border-[var(--color-brand)] bg-[var(--color-brand-subtle)] p-6">
        <h3 className="mb-2 text-[16px] font-semibold text-white">{t('delete_confirm_title')}</h3>
        <p className="mb-4 text-[14px] text-[var(--color-text-secondary)]">{t('delete_confirm_body')}</p>
        {error && <p className="mb-3 text-[13px] text-[var(--color-brand)]">{error}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-full bg-[var(--color-brand)] px-6 py-2.5 text-[14px] font-medium text-white disabled:opacity-50"
          >
            {t('delete_confirm_button')}
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            className="rounded-full border border-[var(--color-surface-border)] px-6 py-2.5 text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-white"
          >
            {t('delete_cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowConfirm(true)}
      className="rounded-full border border-[var(--color-brand)] px-6 py-2.5 text-[14px] font-medium text-[var(--color-brand)] hover:bg-[var(--color-brand-subtle)]"
    >
      {t('delete_account')}
    </button>
  );
}
