import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdmin } from '@/libs/AdminAuth';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Ticket Love admin' },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/account', label: 'Account' },
];

/**
 * Shell for every signed-in back-office page.
 *
 * Lives in a (dashboard) route group so /admin/login sits outside it and stays
 * reachable without a session — no path check needed, which is what a single
 * /admin layout would have required.
 * @param props - Page content to render inside the shell.
 * @returns The guarded admin shell.
 */
export default async function AdminDashboardLayout(props: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) {
    redirect('/admin/login');
  }

  return (
    <div className="flex min-h-screen bg-[#0f0f0f]">
      <aside className="w-56 shrink-0 border-r border-[#2a2a2a] p-6">
        <p className="mb-6 text-[15px] font-bold text-white">Ticket Love admin</p>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-[14px] text-[#a1a1a1] transition-colors hover:bg-[#1a1a1a] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-[#2a2a2a] px-8 py-4">
          <span className="text-[13px] text-[#a1a1a1]">{admin.email}</span>
          <form action="/api/admin/logout" method="post">
            <button
              type="submit"
              className="text-[13px] text-[#a1a1a1] transition-colors hover:text-white"
            >
              Sign out
            </button>
          </form>
        </header>
        <main className="p-8">{props.children}</main>
      </div>
    </div>
  );
}
