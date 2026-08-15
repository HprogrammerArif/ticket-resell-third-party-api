import { Link } from '@/libs/I18nNavigation';

export function SectionHeading(props: {
  title: string;
  seeAllHref?: string;
  seeAllLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h2 className="text-[32px] font-semibold text-[var(--color-text-primary)]">
        {props.title}
      </h2>
      {props.seeAllHref && (
        <Link
          href={props.seeAllHref}
          className="text-[14px] text-[var(--color-text-secondary)] hover:text-white"
        >
          {props.seeAllLabel ?? 'See All →'}
        </Link>
      )}
    </div>
  );
}
