import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { TnPerformerImage } from '@/types/Catalog';

/**
 * Renders a performer photograph with its Creative Commons attribution.
 *
 * The file is fetched through /api/images/proxy rather than directly: Wikimedia
 * answers 403 to requests with no User-Agent and 429 to a generic browser one,
 * and next/image uses its own agent when fetching a remote host. The proxy
 * supplies the descriptive agent their policy requires.
 *
 * Returns null when there is no image so the caller can render its own
 * placeholder — roughly one performer in ten has no photograph on Wikipedia,
 * and that must look deliberate rather than broken.
 * @param props - The resolved image, the performer's name, and optional styling.
 *   imgClassName tunes the crop: Wikimedia portraits cropped into a wide band
 *   lose the face at the default centre, so callers with landscape frames pass
 *   an object-position that keeps it.
 * @returns The image with attribution, or null when there is nothing to show.
 */
export function PerformerImage(props: {
  image: TnPerformerImage | null;
  name: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  /**
   * Renders the attribution as a link to the source page.
   *
   * Off by default, and deliberately opt-in: both card components wrap their
   * whole body in a Link, and an anchor inside an anchor is invalid HTML. The
   * browser hoists the inner one out during parsing, the DOM stops matching
   * what React rendered, and hydration fails for the entire tree. Defaulting
   * to plain text means forgetting this flag costs a hyperlink on an sr-only
   * caption rather than breaking the page.
   *
   * Pass it only where the image is not inside a link and is not covered by
   * pointer-events-none.
   */
  linkAttribution?: boolean;
}) {
  const t = useTranslations('PerformerImage');

  if (!props.image) {
    return null;
  }

  return (
    <figure className={props.className}>
      <Image
        src={`/api/images/proxy?url=${encodeURIComponent(props.image.url)}`}
        alt={t('alt', { name: props.name })}
        fill
        sizes={props.sizes ?? '(max-width: 768px) 100vw, 400px'}
        className={`object-cover ${props.imgClassName ?? ''}`}
      />
      <figcaption className="sr-only">
        {props.linkAttribution
          ? (
              <a href={props.image.sourcePage} target="_blank" rel="noopener noreferrer">
                {t('attribution')}
              </a>
            )
          : t('attribution')}
      </figcaption>
    </figure>
  );
}
