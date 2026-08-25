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
  // Do NOT add includeBootstrap=false / includeJQuery=false here.
  //
  // The guide offers them for in-page embeds where the widget's Bootstrap 3.4.1
  // and jQuery 3.6.0 would collide with the host page. That cannot happen here:
  // the widget runs inside an iframe, so its libraries live in a separate
  // document and never meet our Tailwind styles. There is no conflict to avoid.
  //
  // Suppressing them was tried on 2026-08-22 and broke the map outright —
  // the widget's own code calls jQuery, so it fails with
  // "Uncaught ReferenceError: jQuery is not defined" and nothing renders.
  const src = `${MAPWIDGET_HOST}/js?eventId=${props.eventId}&websiteConfigId=${Env.NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID}&useDarkTheme=true`;

  // <base target="_top"> is what keeps checkout working from inside the iframe.
  //
  // checkout.tickettransaction.com sends `X-Frame-Options: SAMEORIGIN` (verified
  // 2026-08-25), so it refuses to render in an iframe on our domain. The widget
  // hands off with a form POST whose target is conditional in their minified
  // code — `<form target="_blank">` on one branch, an untargeted `<form>` on the
  // other. The untargeted branch would submit inside this iframe and the customer
  // would get a blank box instead of a checkout.
  //
  // A base target of _top makes any untargeted form submit against the whole
  // window; an explicit target="_blank" still wins and opens a tab. Either way
  // checkout escapes the iframe, without us needing to know which branch runs.
  //
  // UNVERIFIED against a real checkout: TN has no Sandbox checkout (liaison R29),
  // so this cannot be tested until Production. Watch for in-widget links
  // unexpectedly navigating the whole page — the widget is JS-driven so this is
  // unlikely, but it is the failure mode this introduces.
  //
  // upgrade-insecure-requests is load-bearing, not hardening.
  //
  // The Seatics script builds its stylesheet URL with a hardcoded http:// scheme
  // (e.g. http://mapwidget3-sandbox.seatics.com/Css/dark-mobile?v=...). On an
  // HTTPS page the browser blocks that as mixed content and the map renders
  // unstyled or not at all. The same file is served fine over https, so this
  // directive tells the browser to upgrade the scheme rather than block it.
  //
  // This never reproduces on http://localhost — same scheme, so nothing is
  // "mixed". It only appears once the site is on HTTPS. See liaison Q10(b).
  const srcDoc = `<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
<base target="_top">
<style>html,body{margin:0;padding:0;background:#0f0f0f;}</style>
</head>
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
