import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { TnPerformerImage } from '@/types/Catalog';

/**
 * Renders a performer photograph with its Creative Commons attribution.
 *
 * Returns null when there is no image so the caller can render its own
 * placeholder — roughly one performer in ten has no photograph on Wikipedia,
 * and that must look deliberate rather than broken.
 * @param props - The resolved image, the performer's name, and optional styling.
 * @returns The image with attribution, or null when there is nothing to show.
 */
export function PerformerImage(props: {
  image: TnPerformerImage | null;
  name: string;
  className?: string;
  sizes?: string;
}) {
  const t = useTranslations('PerformerImage');

  if (!props.image) {
    return null;
  }

  return (
    <figure className={props.className}>
      <Image
        src={props.image.url}
        alt={t('alt', { name: props.name })}
        fill
        sizes={props.sizes ?? '(max-width: 768px) 100vw, 400px'}
        className="object-cover"
      />
      <figcaption className="sr-only">
        <a href={props.image.sourcePage} target="_blank" rel="noopener noreferrer">
          {t('attribution')}
        </a>
      </figcaption>
    </figure>
  );
}
