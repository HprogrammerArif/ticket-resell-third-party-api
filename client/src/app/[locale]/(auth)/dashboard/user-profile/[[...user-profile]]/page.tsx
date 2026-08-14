import { setRequestLocale } from 'next-intl/server';
import { getUser } from '@/libs/Auth';

export default async function UserProfilePage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const user = await getUser();

  return (
    <div className="max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
      <div className="mb-6 border-b border-gray-100 pb-6">
        <h2 className="text-2xl font-bold text-gray-900">User Profile</h2>
        <p className="text-sm text-gray-500">Manage your account credentials and details</p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold tracking-wider text-gray-500 uppercase">
            Account ID
          </h3>
          <p className="mt-1 rounded-lg border border-gray-100 bg-gray-50 p-2.5 font-mono text-lg text-gray-900">
            {user?.id ?? 'N/A'}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold tracking-wider text-gray-500 uppercase">
            Email Address
          </h3>
          <p className="mt-1 rounded-lg border border-gray-100 bg-gray-50 p-2.5 text-lg text-gray-900">
            {user?.email ?? 'N/A'}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold tracking-wider text-gray-500 uppercase">Role</h3>
          <p className="mt-1 rounded-lg border border-gray-100 bg-gray-50 p-2.5 text-lg text-gray-900 capitalize">
            {user?.role ?? 'User'}
          </p>
        </div>
      </div>
    </div>
  );
}
