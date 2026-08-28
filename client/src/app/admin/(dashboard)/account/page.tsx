import { getAdmin } from '@/libs/AdminAuth';
import { PasswordForm } from './PasswordForm';

export default async function AdminAccountPage() {
  const admin = await getAdmin();

  return (
    <div>
      <h1 className="mb-6 text-[24px] font-bold text-white">Account</h1>

      <div className="mb-8 rounded-xl border border-[#2a2a2a] bg-[#161616] p-6">
        <p className="mb-1 text-[13px] text-[#a1a1a1]">Signed in as</p>
        <p className="text-[15px] text-white">{admin?.email}</p>
      </div>

      <div className="rounded-xl border border-[#2a2a2a] bg-[#161616] p-6">
        <h2 className="mb-4 text-[15px] font-semibold text-white">Change password</h2>
        <PasswordForm />
      </div>
    </div>
  );
}
