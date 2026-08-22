'use client';

import { useTranslations } from 'next-intl';
import { Env } from '@/libs/Env';

type MapWidgetEmbedProps = {
  eventId: number;
};

// Bound to NEXT_PUBLIC_MAPWIDGET_ENV, not NODE_ENV. Those are different
// questions: NODE_ENV describes how this bundle was built, while the Seatics
// deployment must match whichever TicketNetwork catalog supplied the event ID.
// A production build pointed at the TN sandbox must still load sandbox maps —
// production Seatics does not know sandbox event IDs and returns an empty map.
const MAPWIDGET_HOST = Env.NEXT_PUBLIC_MAPWIDGET_ENV === 'production'
  ? 'https://mapwidget3.seatics.com'
  : 'https://mapwidget3-sandbox.seatics.com';

export function MapWidgetEmbed(props: MapWidgetEmbedProps) {
  const t = useTranslations('EventDetailPage');
  // includeBootstrap/includeJQuery default to true and would inject Bootstrap
  // 3.4.1 and jQuery 3.6.0. This project uses neither, and Bootstrap's reset
  // collides with Tailwind. Suppressed per the MapWidget3 guide (V10).
  const src = `${MAPWIDGET_HOST}/js?eventId=${props.eventId}&websiteConfigId=${Env.NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID}&useDarkTheme=true&includeBootstrap=false&includeJQuery=false`;

  const srcDoc = `<!DOCTYPE html>
<html>
<head><style>html,body{margin:0;padding:0;background:#0f0f0f;}</style></head>
<body>
<div id="tn-mapwidget-container"></div>
<script src="${src}"><\/script>
</body>
</html>`;

  // Height switches at exactly 992px because that is the widget's own layout
  // breakpoint, not a Tailwind default — below it the widget renders its mobile
  // layout and expects to own the full screen (V9).
  //
  // Because the widget lives in an iframe, its "screen" is this element rather
  // than the page, so the site header and footer are already outside its
  // measurements. What it does need is a viewport-proportional height: a fixed
  // 900px on a ~667px-tall phone forces the user to scroll the page to reach
  // the widget's own controls, and nests two scroll contexts.
  //
  // svh (small viewport height) rather than vh so mobile browser chrome does
  // not push the bottom of the map out of reach.
  return (
    <iframe
      title={t('ticket_map_title')}
      srcDoc={srcDoc}
      className="mx-auto block h-[85svh] min-h-[560px] w-full max-w-[1500px] border-0 min-[992px]:h-[900px]"
    />
  );
}
