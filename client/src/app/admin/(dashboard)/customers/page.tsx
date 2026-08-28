import { getAdminToken } from '@/libs/AdminAuth';
import { Env } from '@/libs/Env';

type CustomerListItem = {
  id: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
};

type CustomerPage = {
  results: CustomerListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
};

async function fetchCustomers(q: string): Promise<CustomerPage> {
  const token = await getAdminToken();
  const url = new URL(`${Env.BACKEND_API_URL}/api/admin/customers`);
  if (q) {
    url.searchParams.set('q', q);
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    return { results: [], page: 1, pageSize: 25, totalCount: 0 };
  }
  return (await res.json()) as CustomerPage;
}

function displayName(customer: CustomerListItem): string {
  const full = [customer.firstName, customer.lastName].filter(Boolean).join(' ');
  return customer.displayName ?? (full || '—');
}

export default async function AdminCustomersPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await props.searchParams;
  const term = q ?? '';
  const data = await fetchCustomers(term);

  return (
    <div>
      <h1 className="mb-6 text-[24px] font-bold text-white">Customers</h1>

      {/* GET form so the search term lives in the URL and the page stays a
          server component — no client state needed. */}
      <form method="get" className="mb-6 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={term}
          placeholder="Search by email or name"
          aria-label="Search customers"
          className="w-full max-w-[380px] rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#ea2a43]"
        />
        <button type="submit" className="rounded-lg bg-[#ea2a43] px-4 py-2.5 text-[14px] font-semibold text-white">
          Search
        </button>
      </form>

      <p className="mb-3 text-[13px] text-[#a1a1a1]">
        {data.totalCount} {data.totalCount === 1 ? 'customer' : 'customers'}
      </p>

      <div className="overflow-x-auto rounded-xl border border-[#2a2a2a]">
        <table className="w-full text-left text-[14px]">
          <thead className="bg-[#161616] text-[13px] text-[#a1a1a1]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((customer) => (
              <tr key={customer.id} className="border-t border-[#2a2a2a] text-white">
                <td className="px-4 py-3">{displayName(customer)}</td>
                <td className="px-4 py-3 text-[#c9c9c9]">{customer.email}</td>
                <td className="px-4 py-3 text-[#a1a1a1]">
                  {new Date(customer.createdAt).toLocaleDateString('en-GB')}
                </td>
              </tr>
            ))}
            {data.results.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-[#a1a1a1]">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
