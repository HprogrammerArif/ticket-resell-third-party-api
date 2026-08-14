---
name: add-component
description: Create a new React component with proper props convention, named export, i18n, optional Storybook story, and co-located test file.
---

# Add Component Skill

Use this skill when creating a new reusable React component.

## File Location

All shared components live in `src/components/`. Co-locate test files next to the implementation.

```
src/components/
  MyComponent.tsx
  MyComponent.test.tsx       # co-located unit test
  MyComponent.stories.tsx    # optional Storybook story
```

## Component Template

```tsx
import { useTranslations } from 'next-intl';

export function MyComponent(props: {
  title: string;
  count: number;
  variant?: 'primary' | 'secondary';
}) {
  const t = useTranslations('MyComponent');

  return (
    <div className="rounded-lg border p-4">
      <h2>{props.title}</h2>
      <p>{t('count_label', { count: props.count })}</p>
    </div>
  );
}
```

## Rules

- **Named exports only** — no `export default` (except Next.js pages/layouts).
- **Single `props` param** with inline type — access as `props.foo`, never destructure.
- **No `useMemo`/`useCallback`** — React compiler handles memoization.
- **Avoid `useEffect`** — prefer server components or event handlers.
- **Use `React.ReactNode`**, not `ReactNode`.
- **Inline short event handlers**; extract only when complex.
- Use `useTranslations` (client) for any user-visible strings.
- Use Tailwind v4 utility classes for styling. Reuse shared components.

## Test Template

```tsx
// MyComponent.test.tsx
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders title text', async () => {
    const screen = render(<MyComponent title="Hello" count={5} />);
    await expect.element(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Storybook Template (Optional)

```tsx
// MyComponent.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { MyComponent } from './MyComponent';

const meta = {
  component: MyComponent,
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Example',
    count: 42,
  },
};
```

## Test Naming Rules

- Top `describe` = component name.
- `it` titles: short, third-person present, `verb + object + context`.
- Sentence case, no period.
- Omit "should/works/handles/checks/validates".
