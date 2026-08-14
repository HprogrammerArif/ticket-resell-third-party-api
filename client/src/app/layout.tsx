// Since we have a `[locale]` layout that provides html/body tags,
// this root layout simply passes children through.
// It is required by Next.js App Router even when using next-intl.

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
