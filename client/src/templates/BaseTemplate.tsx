import { AppConfig } from '@/utils/AppConfig';

/**
 * Root layout shell for all marketing pages.
 * Renders a sticky navbar, main content area, and footer.
 */
export const BaseTemplate = (props: {
  leftNav: React.ReactNode;
  rightNav?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="flex min-h-screen flex-col bg-white text-gray-900 antialiased">
    {/* ── Sticky Navbar ── */}
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo / app name */}
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold tracking-tight text-gray-900">
            {AppConfig.name}
          </span>
          <nav aria-label="Main navigation">
            <ul className="hidden items-center gap-6 text-sm font-medium text-gray-600 sm:flex">
              {props.leftNav}
            </ul>
          </nav>
        </div>

        {/* Right-side nav (auth links + locale switcher) */}
        <nav>
          <ul className="flex items-center gap-4 text-sm font-medium text-gray-600">
            {props.rightNav}
          </ul>
        </nav>
      </div>
    </header>

    {/* ── Page content ── */}
    <main className="flex-1">{props.children}</main>

    {/* ── Footer ── */}
    <footer className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-gray-500 sm:flex-row sm:px-6 lg:px-8">
        <span>
          © {new Date().getFullYear()}{' '}
          <span className="font-semibold text-gray-700">{AppConfig.name}</span>.
          All rights reserved.
        </span>
        <p className="text-xs text-gray-400">
          Built with Next.js · TypeScript · Tailwind CSS
        </p>
      </div>
    </footer>
  </div>
);
