import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PolicyEmbed } from '@/components/legal/PolicyEmbed';

type IProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: IProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'PoliciesPage' });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function PoliciesPage(props: IProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'PoliciesPage' });

  return (
    <div className="mx-auto max-w-[1440px] px-[107px] py-10 max-md:px-4">
      <h1 className="mb-2 text-[32px] font-bold text-white">{t('heading')}</h1>
      <p className="mb-8 text-[15px] text-[var(--color-text-secondary)]">
        {t('intro')}
      </p>
      <PolicyEmbed />
    </div>
  );
}
