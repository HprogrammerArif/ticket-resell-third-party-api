import { getTranslations } from 'next-intl/server';

/**
 * Reserved space for an advertisement.
 *
 * Steven asked for space alongside the seat map for ads. The layout now holds
 * it open, but nothing fills it yet — no ad provider has been chosen.
 *
 * With no ad to show it renders **nothing in production**. An empty box
 * labelled "Ad Zone" on a live page reads as an unfinished site to a customer,
 * and this one would sit beside the seat map, at the moment someone is
 * deciding whether to spend money. In development it draws its outline so the
 * space is visible while working on the page.
 *
 * To fill it, pass the ad markup as children — a script tag from a network, an
 * image and link sold directly, or a house promotion. Height comes from the
 * caller: an ad beside a seat map and an ad across a homepage are not the same
 * shape.
 * @param props - The ad to render, and the locale for the development label.
 * @returns The ad, the development outline, or nothing.
 */
export async function AdSlot(props: {
  locale: string;
  children?: React.ReactNode;
  className?: string;
}) {
  if (props.children) {
    return <div className={props.className}>{props.children}</div>;
  }

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const t = await getTranslations({ locale: props.locale, namespace: 'EventDetailPage' });

  return (
    <div
      className={`flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-[var(--color-surface-border)] text-[13px] text-[var(--color-text-muted)] ${props.className ?? ''}`}
    >
      {t('ad_zone')}
    </div>
  );
}
