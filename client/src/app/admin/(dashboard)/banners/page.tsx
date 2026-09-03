import type { Metadata } from 'next';
import { BannerManager } from './BannerManager';

export const metadata: Metadata = { title: 'Banners — Ticket Love admin' };

/**
 * Homepage banner management.
 * @returns The banners page.
 */
export default function AdminBannersPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Homepage banners</h1>
      <BannerManager />
    </div>
  );
}
