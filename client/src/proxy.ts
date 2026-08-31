import createMiddleware from 'next-intl/middleware';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { routing } from '@/libs/I18nRouting';

const handleI18nRouting = createMiddleware(routing);

const isProtectedRoute = (pathname: string) =>
  pathname === '/dashboard' ||
  pathname.startsWith('/dashboard/') ||
  /^\/(en|fr)\/dashboard(\/|$)/u.test(pathname);

const isAuthPage = (pathname: string) =>
  pathname === '/sign-in' ||
  pathname.startsWith('/sign-in/') ||
  pathname === '/sign-up' ||
  pathname.startsWith('/sign-up/') ||
  /^\/(en|fr)\/(sign-in|sign-up)(\/|$)/u.test(pathname);

export default function proxy(request: NextRequest, _event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has('auth_token');

  // Determine locale prefix from pathname
  const localeMatch = pathname.match(/^\/(fr)/u);
  const localePrefix = localeMatch ? `/${localeMatch[1]}` : '';

  if (isProtectedRoute(pathname) && !hasToken) {
    const signInUrl = new URL(`${localePrefix}/sign-in`, request.url);
    return NextResponse.redirect(signInUrl);
  }

  if (isAuthPage(pathname) && hasToken) {
    const dashboardUrl = new URL(`${localePrefix}/dashboard`, request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  const response = handleI18nRouting(request);
  if (response instanceof NextResponse) {
    response.headers.set('x-pathname', pathname);
  }
  return response;
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/_next`, `/_vercel`, `monitoring`, or `/api`
  // - … `/admin`, which lives outside the `[locale]` segment. The admin console
  //   is single-language and its routes are `/admin/*`, not `/en/admin/*`, so
  //   next-intl's router has no matching route and answers 404 for every one of
  //   them. Excluding it here is what makes the admin console reachable at all.
  // - … ones ending in a real file extension (e.g. `favicon.ico`, `logo.png`).
  //   Anchored at the end with `\.\w+$` (a dot followed by word characters), not
  //   "contains a dot anywhere" — TicketNetwork category paths look like
  //   `/categories/.1128.1130.` (trailing dot, no extension chars after it) and
  //   must still hit i18n routing.
  matcher: '/((?!_next|_vercel|monitoring|api|admin|.*\\.\\w+$).*)',
};
