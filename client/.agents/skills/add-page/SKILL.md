---
name: add-page
description: Create a new locale-aware Next.js page with proper i18n, SEO metadata, translations, and route group placement.
---

# Add Page Skill

Use this skill when creating a new page in the Next.js App Router.

## File Structure

All pages live under `src/app/[locale]/`. Route groups organize pages:

- `(marketing)/` — Public pages (landing, about, pricing, etc.)
- `(auth)/(center)/` — Auth pages (sign-in, sign-up) using centered layout
- `(auth)/dashboard/` — Protected pages behind authentication

## Step-by-Step

### 1. Create the page file

```
src/app/[locale]/(marketing)/example/page.tsx   # public page
src/app/[locale]/(auth)/dashboard/example/page.tsx  # protected page
```

### 2. Page template

```tsx
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getI18nPath } from '@/utils/Helpers';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'ExamplePage' });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
    alternates: {
      canonical: getI18nPath('/example', locale),
    },
  };
}

export default async function ExamplePage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const t = await getTranslations('ExamplePage');

  return (
    <div>
      <h1>{t('title')}</h1>
    </div>
  );
}
```

### 3. Add translation keys

Add the namespace to **both** locale files (`src/locales/en.json` and `src/locales/fr.json`):

```json
{
  "ExamplePage": {
    "meta_title": "Example - MyApp",
    "meta_description": "Description for SEO",
    "title": "Example page"
  }
}
```

### 4. Update sitemap (if public)

Add the route to `src/app/sitemap.ts`:

```ts
const routes = ['', '/example'];
```

## Rules

- Page namespace **must** end with `Page` (e.g. `ExamplePage`).
- Default export name **must** end with `Page` (e.g. `ExamplePage`).
- Always call `setRequestLocale(locale)` before using translations.
- Always `await props.params` — params are async in Next.js 16.
- Use `getTranslations` (server) or `useTranslations` (client).
- Use sentence case for all translation values.
- Never hard-code user-visible strings.
- Dashboard pages don't need per-page metadata (defined in the layout).
