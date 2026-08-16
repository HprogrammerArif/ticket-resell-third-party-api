'use client';

import { Env } from '@/libs/Env';

type MapWidgetEmbedProps = {
  eventId: number;
};

const MAPWIDGET_HOST = Env.NODE_ENV === 'production'
  ? 'https://mapwidget3.seatics.com'
  : 'https://mapwidget3-sandbox.seatics.com';

export function MapWidgetEmbed(props: MapWidgetEmbedProps) {
  const src = `${MAPWIDGET_HOST}/js?eventId=${props.eventId}&websiteConfigId=${Env.NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID}&useDarkTheme=true`;

  const srcDoc = `<!DOCTYPE html>
<html>
<head><style>html,body{margin:0;padding:0;background:#0f0f0f;}</style></head>
<body>
<div id="tn-mapwidget-container"></div>
<script src="${src}"><\/script>
</body>
</html>`;

  return (
    <iframe
      title="Ticket selection"
      srcDoc={srcDoc}
      className="mx-auto block h-[900px] w-full max-w-[1500px] border-0"
    />
  );
}
