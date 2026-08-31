'use client';

import { useState } from 'react';

const FIELD_CLASS
  = 'w-full max-w-[380px] rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#ea2a43]';

/**
 * Lets an administrator change their own password.
 * @returns The change-password form.
 */
export function PasswordForm() {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    const res = await fetch('/api/admin/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: data.get('currentPassword'),
        newPassword: data.get('newPassword'),
      }),
    });

    if (res.ok) {
      form.reset();
      setMessage({ ok: true, text: 'Password changed.' });
    } else {
      const body = (await res.json()) as { error?: string };
      setMessage({ ok: false, text: body.error ?? 'Could not change password' });
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className="mb-1 block text-[13px] text-[#a1a1a1]">
          Current password
        </label>
        <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" className={FIELD_CLASS} />
      </div>

      <div>
        <label htmlFor="newPassword" className="mb-1 block text-[13px] text-[#a1a1a1]">
          New password
        </label>
        <input id="newPassword" name="newPassword" type="password" required minLength={8} autoComplete="new-password" className={FIELD_CLASS} />
      </div>

      {message !== null && (
        <output className={message.ok ? 'block text-[13px] text-green-400' : 'block text-[13px] text-[#ea2a43]'}>
          {message.text}
        </output>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[#ea2a43] px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Change password'}
      </button>
    </form>
  );
}
