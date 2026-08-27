'use client';

import { useTranslations } from 'next-intl';

/**
 * Renders TicketNetwork's hosted policy content.
 *
 * TicketNetwork requires a policy page carrying their script (confirmed by
 * Integration Support, 2026-08-26). The script is served from
 * tickettransaction.com and carries the policy text as data.
 *
 * It is embedded in an iframe for the same reason as MapWidgetEmbed: the script
 * calls document.write, which replaces the whole document when it runs after
 * the initial parse. Loading it on the page itself — via next/script or any
 * other injection — would blank the site. A fresh srcDoc document gives it the
 * initial-parse context it expects and contains the damage.
 */
export function PolicyEmbed() {
  const t = useTranslations('PoliciesPage');

  const src = 'https://tickettransaction.com/?https=true&bid=12499&sitenumber=1&tid=600';

  const srcDoc = `<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base target="_top">
<style>
html,body{margin:0;padding:24px;background:#fff;color:#222;
  font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;
  font-size:14px;line-height:1.6;}
a{color:#0645ad;}
img{max-width:100%;height:auto;}
table{max-width:100%;}
</style>
</head>
<body>
<script src="${src}"><\/script>
</body>
</html>`;

  return (
    <iframe
      title={t('embed_title')}
      srcDoc={srcDoc}
      className="block h-[calc(100vh-220px)] min-h-[560px] w-full rounded-xl border-0 bg-white"
    />
  );
}
