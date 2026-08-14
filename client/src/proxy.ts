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

  return handleI18nRouting(request);
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/_next`, `/_vercel` or `monitoring`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: '/((?!_next|_vercel|monitoring|api|.*\\..*).*)',
};
