'use client';

export default function ErrorBoundary(props: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[1440px] px-[107px] py-24 text-center max-md:px-4">
      <p className="mb-4 text-[18px] text-[var(--color-text-primary)]">
        Could not load this event.
      </p>
      <button
        type="button"
        onClick={props.reset}
        className="rounded-full bg-[var(--color-brand-muted)] px-6 py-2 text-[14px] text-white hover:bg-[var(--color-brand)]"
      >
        Try again
      </button>
    </div>
  );
}
