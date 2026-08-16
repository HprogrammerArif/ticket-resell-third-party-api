'use client';

import Script from 'next/script';
import { Env } from '@/libs/Env';

type MapWidgetEmbedProps = {
  eventId: number;
};

const MAPWIDGET_HOST = Env.NODE_ENV === 'production'
  ? 'https://mapwidget3.seatics.com'
  : 'https://mapwidget3-sandbox.seatics.com';

export function MapWidgetEmbed(props: MapWidgetEmbedProps) {
  const src = `${MAPWIDGET_HOST}/js?eventId=${props.eventId}&websiteConfigId=${Env.NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID}&useDarkTheme=true`;

  return (
    <div className="mx-auto min-h-[900px] w-full max-w-[1500px]">
      {/* TicketNetwork's Seatics MapWidget3 self-renders into this container once its script loads. */}
      <div id="tn-mapwidget-container" />
      <Script src={src} strategy="afterInteractive" />
    </div>
  );
}
