'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const FIELD_CLASS
  = 'w-full rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#ea2a43]';

/**
 * Email and password form for the back office.
 * @returns The sign-in form.
 */
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
      }),
    });

    if (res.ok) {
      router.replace('/admin');
      router.refresh();
      return;
    }

    const data = (await res.json()) as { error?: string };
    setError(data.error ?? 'Sign in failed');
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-[13px] text-[#a1a1a1]">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="username" className={FIELD_CLASS} />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-[13px] text-[#a1a1a1]">
          Password
        </label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className={FIELD_CLASS} />
      </div>

      {error !== null && (
        <p role="alert" className="text-[13px] text-[#ea2a43]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#ea2a43] px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
