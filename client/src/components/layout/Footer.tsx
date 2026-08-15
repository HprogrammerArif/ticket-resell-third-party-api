import { getTranslations } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';

export async function Footer(props: { locale: string }) {
  const t = await getTranslations({ locale: props.locale, namespace: 'Footer' });

  return (
    <footer className="border-t border-[var(--color-surface-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-[1440px] px-[107px] py-16 max-md:px-4">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Company */}
          <div>
            <p className="mb-4 text-[14px] font-semibold text-[var(--color-text-primary)]">
              {t('company_heading')}
            </p>
            <ul className="space-y-3">
              {[
                { label: t('company_about'), href: '/' },
                { label: t('company_services'), href: '/' },
                { label: t('company_collections'), href: '/' },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-[14px] text-[var(--color-text-secondary)] hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About Us */}
          <div>
            <p className="mb-4 text-[14px] font-semibold text-[var(--color-text-primary)]">
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
                    className="text-[14px] text-[var(--color-text-secondary)] hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="mb-4 text-[14px] font-semibold text-[var(--color-text-primary)]">
              {t('resources_heading')}
            </p>
            <ul className="space-y-3">
              {[
                { label: t('resources_privacy'), href: '/' },
                { label: t('resources_terms'), href: '/' },
                { label: t('resources_work_with_us'), href: '/' },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-[14px] text-[var(--color-text-secondary)] hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Subscribe */}
          <div>
            <p className="mb-4 text-[14px] font-semibold text-[var(--color-text-primary)]">
              {t('subscribe_heading')}
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder={t('subscribe_placeholder')}
                className="flex-1 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-raised)] px-4 py-2 text-[14px] text-white placeholder:text-[var(--color-text-muted)] outline-none"
              />
              <button
                type="button"
                className="rounded-full bg-[var(--color-brand-muted)] px-4 py-2 text-[14px] font-medium text-white hover:bg-[var(--color-brand)]"
              >
                {t('subscribe_button')}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-[var(--color-surface-border)] pt-6 text-center text-[13px] text-[var(--color-text-muted)]">
          {t('copyright')}
        </div>
      </div>
    </footer>
  );
}
