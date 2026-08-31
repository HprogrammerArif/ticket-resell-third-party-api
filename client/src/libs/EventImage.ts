import { getPerformerImage } from '@/libs/CachedCatalogApi';
import type { TnEvent, TnPerformerImage } from '@/types/Catalog';

/**
 * Resolves the photograph that represents each event.
 *
 * An event has no image of its own — TicketNetwork's catalogue carries none —
 * so it borrows its headliner's. The first billed performer is the headliner:
 * TN lists the touring act first for concerts and the away team first for
 * sport, which is the name a shopper recognises in both cases.
 *
 * Resolved in one Promise.all rather than a loop so a single slow Wikimedia
 * lookup cannot serialise a whole grid of cards.
 *
 * Events with no performers at all — a US Open session, a venue-only listing —
 * yield null, and the card falls back to its category gradient.
 * @param events - The events to resolve images for.
 * @returns One entry per event, positionally aligned with the input, null where there is no photograph.
 */
export function getEventImages(
  events: TnEvent[],
): Promise<(TnPerformerImage | null)[]> {
  return Promise.all(
    events.map((event) => {
      const headliner = event.performers?.[0];
      if (!headliner?.name) {
        return null;
      }
      return getPerformerImage(headliner.name, event.defaultCategory?.text.name);
    }),
  );
}
