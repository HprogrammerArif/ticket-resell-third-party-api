import { getAdminToken } from '@/libs/AdminAuth';
import { Env } from '@/libs/Env';

type Stats = {
  totalCustomers: number;
  signupsLast7Days: number;
};

async function fetchStats(): Promise<Stats> {
  const token = await getAdminToken();
  const res = await fetch(`${Env.BACKEND_API_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    return { totalCustomers: 0, signupsLast7Days: 0 };
  }
  return (await res.json()) as Stats;
}

export default async function AdminDashboardPage() {
  const stats = await fetchStats();

  const tiles = [
    { label: 'Total customers', value: stats.totalCustomers },
    { label: 'Signups this week', value: stats.signupsLast7Days },
  ];

  return (
    <div>
      <h1 className="mb-6 text-[24px] font-bold text-white">Dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 max-md:grid-cols-1">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-[#2a2a2a] bg-[#161616] p-6">
            <p className="mb-1 text-[13px] text-[#a1a1a1]">{tile.label}</p>
            <p className="text-[28px] font-bold text-white">{tile.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#2a2a2a] bg-[#161616] p-6">
        <h2 className="mb-1 text-[15px] font-semibold text-white">Sales reporting</h2>
        <p className="mb-4 text-[13px] text-[#a1a1a1]">
          Orders, commission and payouts are held by TicketNetwork, who process
          every sale. Their portal is the source of truth for revenue.
        </p>
        <a
          href="https://www.ticketnetwork.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-[#ea2a43] px-4 py-2 text-[14px] font-semibold text-white"
        >
          Open TicketNetwork Portal
        </a>
      </div>
    </div>
  );
}
