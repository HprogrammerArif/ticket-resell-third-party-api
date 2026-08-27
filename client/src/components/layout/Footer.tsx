'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/libs/I18nNavigation';

export function Footer(_props?: { locale?: string }) {
  const t = useTranslations('Footer');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
  };

  return (
    <footer className="border-t border-[#262626] bg-[#0f0f0f]">
      <div className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Company */}
          <div className="lg:col-span-2">
            <p className="mb-4 text-[14px] font-semibold text-white uppercase tracking-wider">
              {t('company_heading')}
            </p>
            <ul className="space-y-3">
              {[
                { label: t('company_about'), href: '/' },
                { label: t('company_services'), href: '/categories' },
                { label: t('company_collections'), href: '/events' },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-[14px] text-[#a1a1a1] transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About Us */}
          <div className="lg:col-span-2">
            <p className="mb-4 text-[14px] font-semibold text-white uppercase tracking-wider">
              {t('about_heading')}
            </p>
            <ul className="space-y-3">
              {[
                { label: t('about_mission'), href: '/' },
                { label: t('about_careers'), href: '/' },
                { label: t('about_contact'), href: '/' },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-[14px] text-[#a1a1a1] transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="lg:col-span-3">
            <p className="mb-4 text-[14px] font-semibold text-white uppercase tracking-wider">
              {t('resources_heading')}
            </p>
            <ul className="space-y-3">
              {[
                // Both point at /policies: TicketNetwork hosts the privacy
                // and purchase terms as one document, and requires the page
                // to exist and be reachable.
                { label: t('resources_privacy'), href: '/policies' },
                { label: t('resources_terms'), href: '/policies' },
                { label: t('resources_work_with_us'), href: '/' },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-[14px] text-[#a1a1a1] transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Subscribe */}
          <div className="lg:col-span-5">
            <p className="mb-4 text-[14px] font-semibold text-white uppercase tracking-wider">
              {t('subscribe_heading')}
            </p>
            {!subscribed ? (
              <form onSubmit={handleSubscribe} className="flex items-center gap-2 max-w-md">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('subscribe_placeholder')}
                  suppressHydrationWarning
                  className="h-9 min-w-0 flex-1 rounded-full border border-[#262626] bg-[#1a1a1a] px-4 text-[13px] text-white placeholder:text-[#737373] outline-none focus:border-[var(--color-brand)]"
                />
                <button
                  type="submit"
                  className="h-9 shrink-0 rounded-full bg-[var(--color-brand)] px-5 text-[13px] font-medium text-white transition hover:bg-[#d41e37] cursor-pointer"
                >
                  {t('subscribe_button')}
                </button>
              </form>
            ) : (
              <p className="text-[13px] text-emerald-400">
                {t('subscribe_success')}
              </p>
            )}
          </div>
        </div>

        <div className="mt-12 border-t border-[#262626] pt-6 text-center text-[13px] text-[#737373]">
          {t('copyright')}
        </div>
      </div>
    </footer>
  );
}
