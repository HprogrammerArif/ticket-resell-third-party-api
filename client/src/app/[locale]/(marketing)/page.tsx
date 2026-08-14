import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/libs/I18nNavigation';

type IndexPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: IndexPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'Index' });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function IndexPage(props: IndexPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Index' });

  const features = [
    {
      icon: '🖥️',
      title: t('feature_1_title'),
      description: t('feature_1_description'),
      badge: 'Mode 1',
      accent: 'bg-violet-50 border-violet-100',
      badgeColor: 'bg-violet-100 text-violet-700',
      iconBg: 'bg-violet-100',
    },
    {
      icon: '🔌',
      title: t('feature_2_title'),
      description: t('feature_2_description'),
      badge: 'Mode 2',
      accent: 'bg-sky-50 border-sky-100',
      badgeColor: 'bg-sky-100 text-sky-700',
      iconBg: 'bg-sky-100',
    },
    {
      icon: '⚡',
      title: t('feature_3_title'),
      description: t('feature_3_description'),
      badge: 'Mode 3',
      accent: 'bg-emerald-50 border-emerald-100',
      badgeColor: 'bg-emerald-100 text-emerald-700',
      iconBg: 'bg-emerald-100',
    },
  ] as const;

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-white">
        {/* Subtle background grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#111 1px, transparent 1px), linear-gradient(to right, #111 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Gradient glow */}
        <div className="pointer-events-none absolute inset-x-0 -top-40 -z-10 flex justify-center">
          <div className="h-96 w-[600px] rounded-full bg-gradient-to-r from-violet-200 via-sky-200 to-emerald-200 opacity-30 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pt-24 pb-20 text-center sm:px-6 sm:pt-32 sm:pb-28 lg:px-8">
          {/* Badge */}
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 shadow-sm">
            <span className="size-2 rounded-full bg-emerald-400" />
            Next.js 16 · TypeScript · Tailwind v4
          </span>

          {/* Headline */}
          <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            {t('hero_title')}{' '}
            <span className="bg-gradient-to-r from-violet-600 to-sky-500 bg-clip-text text-transparent">
              {t('hero_title_highlight')}
            </span>
          </h1>

          {/* Sub-description */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-500">
            {t('hero_description')}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/sign-up/"
              className="rounded-xl bg-gray-900 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-gray-700 hover:shadow-md"
            >
              {t('hero_cta_primary')} →
            </Link>
            <Link
              href="/sign-in/"
              className="rounded-xl border border-gray-200 bg-white px-7 py-3.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50"
            >
              {t('hero_cta_secondary')}
            </Link>
          </div>

          {/* Tech pills */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
            {[
              'Drizzle ORM',
              'next-intl',
              'Zod',
              'Vitest',
              'Playwright',
              'Sentry',
              'Storybook',
              'Lefthook',
            ].map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-gray-100 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-500"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features / Modes ── */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t('features_title')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-gray-500">
              {t('features_subtitle')}
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid gap-6 sm:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.badge}
                className={`rounded-2xl border p-8 transition-shadow hover:shadow-md ${feature.accent}`}
              >
                {/* Mode badge */}
                <span
                  className={`mb-4 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${feature.badgeColor}`}
                >
                  {feature.badge}
                </span>

                {/* Icon */}
                <div
                  className={`mb-4 flex size-12 items-center justify-center rounded-xl text-2xl ${feature.iconBg}`}
                >
                  {feature.icon}
                </div>

                <h3 className="mb-2 text-lg font-bold text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-sm leading-6 text-gray-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA strip ── */}
      <section className="border-t border-gray-100 bg-white py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Ready to build?
          </h2>
          <p className="mt-3 text-base text-gray-500">
            Open{' '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-gray-700">
              AppConfig.ts
            </code>{' '}
            to rename the app, then delete what you don't need.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/sign-up/"
              className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
            >
              Create an account
            </Link>
            <Link
              href="/sign-in/"
              className="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Already have one? Sign in →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
