import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getNavMenu } from '@/libs/NavMenu';

export default async function MarketingLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const menus = await getNavMenu();

  return (
    <>
      <Header locale={locale} menus={menus} />
      <main>{props.children}</main>
      <Footer locale={locale} />
    </>
  );
}
