import { unstable_cache } from 'next/cache';
import { ApiClient } from '@/libs/ApiClient';
import type { HeroSlide } from '@/components/catalog/HeroSlider';

type Banner = {
  id: string;
  title: string;
  filename: string;
  linkUrl: string;
  width: number;
  height: number;
};

/**
 * The overlay each uploaded banner is shown under.
 *
 * The hero's headline sits on top of this image, so the artwork always needs
 * something between it and the text. Kept identical to the darkest of the
 * original decorative slides rather than invented — that gradient was already
 * tuned against this headline.
 */
const BANNER_OVERLAY = 'from-black/80 via-black/40 to-transparent';

/**
 * The hero's background slides, uploaded by an administrator.
 *
 * Never throws. The hero is the first thing on the page, so an unreachable API
 * must leave the slider on its fallback images rather than produce a blank
 * screen above the fold.
 *
 * Cached for five minutes, not the seven days used for performer photographs:
 * Steven changes these deliberately and will want to see the result rather
 * than wait a week for it.
 * @returns The slides in display order, or an empty list.
 */
export const getHeroSlides = unstable_cache(
  async (): Promise<HeroSlide[]> => {
    try {
      const data = await ApiClient.get<{ results: Banner[] }>('/api/banners', { params: {} });
      return (data.results ?? []).map((banner) => ({
        src: `/api/banners/file/${banner.filename}`,
        alt: banner.title,
        linkUrl: banner.linkUrl,
        overlay: BANNER_OVERLAY,
        tint: '',
      }));
    } catch {
      return [];
    }
  },
  ['hero-slides'],
  { revalidate: 300, tags: ['banners'] },
);
