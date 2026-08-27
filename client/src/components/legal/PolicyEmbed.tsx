'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const POLICY_SRC
  = 'https://tickettransaction.com/?https=true&bid=12499&sitenumber=1&tid=600';

/** Height used before the frame reports its own, to limit layout shift. */
const INITIAL_HEIGHT = 900;

type HeightMessage = {
  type: 'ticketlove:policy-height';
  height: number;
};

/**
 * Narrows a postMessage payload to the frame's height report.
 * @param data - Untrusted `MessageEvent.data` from the embedded frame.
 * @returns True when the payload carries a numeric content height.
 */
function isHeightMessage(data: unknown): data is HeightMessage {
  return (
    typeof data === 'object'
    && data !== null
    && (data as HeightMessage).type === 'ticketlove:policy-height'
    && typeof (data as HeightMessage).height === 'number'
  );
}

/**
 * Renders TicketNetwork's hosted policy content.
 *
 * TicketNetwork requires a policy page carrying their script (Integration
 * Support, 2026-08-26). The script is served from tickettransaction.com, already
 * branded with our SiteName and SiteUrl, and carries the policy text as data.
 *
 * It is embedded in an iframe for the same reason as MapWidgetEmbed: the script
 * calls document.write, which replaces the whole document when it runs after the
 * initial parse. Loading it on the page itself would blank the site. A fresh
 * srcDoc document gives it the initial-parse context it expects.
 *
 * The frame reports its content height back over postMessage so the element can
 * grow to fit. Without that the reader gets a scrollbox inside a scrolling page,
 * which is awkward to use and makes the content feel bolted on. srcDoc inherits
 * our origin, so this stays same-origin and needs no cross-origin handshake.
 * @returns The policy frame, sized to its content.
 */
export function PolicyEmbed() {
  const t = useTranslations('PoliciesPage');
  const [height, setHeight] = useState(INITIAL_HEIGHT);

  // A window-level listener genuinely needs an effect: the message arrives from
  // the frame after its script has built the content, which is outside React's
  // render cycle and cannot be derived from props or state.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin === window.location.origin && isHeightMessage(event.data)) {
        setHeight(Math.max(INITIAL_HEIGHT, Math.ceil(event.data.height)));
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const srcDoc = `<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base target="_top">
<style>
:root{color-scheme:dark;}
html,body{margin:0;padding:0;background:transparent;overflow:hidden;}
body{
  color:#c9c9c9;
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;
  font-size:15px;line-height:1.75;
  padding:8px 4px 32px;
}
h1,h2,h3,h4{color:#fff;line-height:1.3;margin:2em 0 .6em;font-weight:600;}
h1{font-size:24px;} h2{font-size:20px;} h3{font-size:17px;} h4{font-size:15px;}
h1:first-child,h2:first-child{margin-top:0;}
p{margin:0 0 1.1em;}
a{color:#ea2a43;text-decoration:none;}
a:hover{text-decoration:underline;}
ul,ol{margin:0 0 1.1em;padding-left:1.4em;}
li{margin-bottom:.5em;}
strong,b{color:#fff;font-weight:600;}
hr{border:0;border-top:1px solid #2a2a2a;margin:2em 0;}
img{max-width:100%;height:auto;}
table{width:100%;border-collapse:collapse;margin:0 0 1.4em;font-size:14px;}
th,td{border:1px solid #2a2a2a;padding:10px 12px;text-align:left;vertical-align:top;}
th{background:#1a1a1a;color:#fff;font-weight:600;}
</style>
</head>
<body>
<script src="${POLICY_SRC}"><\/script>
<script>
/* Report content height to the parent so the frame can grow to fit instead of
   scrolling internally. ResizeObserver rather than a one-off measurement
   because the policy content is built by the script above after parse. */
(function () {
  function report() {
    var h = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    parent.postMessage({ type: 'ticketlove:policy-height', height: h }, '*');
  }
  if (window.ResizeObserver) {
    new ResizeObserver(report).observe(document.body);
  }
  window.addEventListener('load', report);
  setTimeout(report, 300);
  setTimeout(report, 1500);
})();
<\/script>
</body>
</html>`;

  return (
    <iframe
      title={t('embed_title')}
      srcDoc={srcDoc}
      scrolling="no"
      style={{ height: `${height}px` }}
      className="block w-full border-0 bg-transparent"
    />
  );
}
