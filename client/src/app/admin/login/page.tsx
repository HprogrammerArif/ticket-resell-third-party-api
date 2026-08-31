import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAdmin } from '@/libs/AdminAuth';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Admin sign in',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const admin = await getAdmin();
  if (admin) {
    redirect('/admin');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f] px-4">
      <div className="w-full max-w-[380px] rounded-2xl border border-[#2a2a2a] bg-[#161616] p-8">
        <h1 className="mb-1 text-[22px] font-bold text-white">Ticket Love admin</h1>
        <p className="mb-6 text-[13px] text-[#a1a1a1]">Sign in to the back office.</p>
        <LoginForm />
      </div>
    </div>
  );
}
