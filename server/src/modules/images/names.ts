/**
 * Name comparison shared by every image source.
 *
 * Both Wikipedia and Ticketmaster expose keyword search that returns a best
 * guess rather than a match, and both return real records for the wrong
 * subject when the act is unknown to them. A wrong photograph is worse than
 * none: it renders perfectly, so nothing downstream can tell it is wrong and
 * only a person looking at the page will notice.
 *
 * Lives in its own file because service.ts and ticketmaster.ts both need it
 * and service.ts imports ticketmaster.ts.
 */

/**
 * Reduces a name to a comparable form.
 *
 * Strips accents, case and punctuation, and removes a trailing parenthetical:
 * Wikipedia disambiguates with one, so "AFI (band)" and "AFI" are the same
 * subject under a different title, not a different act.
 * @param value - A performer name or an article title.
 * @returns The comparable form, possibly empty.
 */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Whether an article is about the act we asked for.
 *
 * Wikipedia search returns its best guess, not a match, and its best guess for
 * an unknown act is often a real article about something else. Measured against
 * the live catalogue, four names in thirty resolved to the wrong subject:
 * "42nd Street" to the Times Square subway station, "Air" to the Earth's
 * atmosphere, "Allen Anthony" to Anthony Newley, "Alabama - The Band" to that
 * band's lead singer. Each returned a real photograph, so nothing downstream
 * could tell it was wrong.
 *
 * Containment is not enough — "42nd Street" appears inside "Times
 * Square-42nd Street station". The article title must be the name itself.
 *
 * TicketNetwork appends descriptors its own catalogue needs, listing that band
 * as "Alabama - The Band" where Wikipedia has "Alabama (band)", so the part
 * before a dash is accepted as an alternative form of the name.
 * Ticketmaster additionally publishes an `aliases` array. A match against any
 * alias counts, which is deliberately more permissive than the Wikipedia path
 * and correct — an alias is the same act billed under another name.
 * @param requested - The performer name from TicketNetwork.
 * @param title - The name the source returned.
 * @param aliases - Alternative names the source publishes, if any.
 * @returns True when the record is about that act.
 */
export function namesMatch(requested: string, title: string, aliases?: string[]): boolean {
  const candidates = new Set([normalizeName(requested)]);
  const beforeDash = requested.split(/\s+-\s+/)[0];
  if (beforeDash) candidates.add(normalizeName(beforeDash));
  candidates.delete('');
  if (candidates.size === 0) return false;

  const forms = [title, ...(aliases ?? [])].map(normalizeName).filter(Boolean);

  return forms.some((form) => candidates.has(form));
}
