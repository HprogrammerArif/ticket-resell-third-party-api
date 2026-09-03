import { unstable_cache } from 'next/cache';
import { ApiClient } from '@/libs/ApiClient';
import type { Banner } from '@/components/catalog/BannerCarousel';

/**
 * Fetches the active homepage banners.
 *
 * Never throws. The banner strip is the first thing on the page, so an
 * unreachable API must degrade to the homepage as it was before banners
 * existed, not to a blank screen above the fold.
 *
 * Cached for five minutes rather than the seven days used for performer
 * photographs: Steven changes these deliberately and will want to see the
 * result, not wait a week for it.
 * @returns The banners in display order, or an empty list.
 */
export const getBanners = unstable_cache(
  async (): Promise<Banner[]> => {
    try {
      const data = await ApiClient.get<{ results: Banner[] }>('/api/banners', { params: {} });
      return data.results ?? [];
    } catch {
      return [];
    }
  },
  ['homepage-banners'],
  { revalidate: 300, tags: ['banners'] },
);
