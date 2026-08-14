'use client';

import { useRouter } from '@/libs/I18nNavigation';

export const SignOutButton = (props: { children: React.ReactNode }) => {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/sign-out', {
        method: 'POST',
      });
      if (response.ok) {
        router.push('/sign-in');
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      className="cursor-pointer border-none text-gray-700 hover:text-gray-900"
      type="button"
    >
      {props.children}
    </button>
  );
};
