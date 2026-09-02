/**
 * Whether a microphone belongs next to a performer's name.
 *
 * Steven asked for the microphone to be dropped from sports teams and from any
 * non-musical or speaking act — a mic beside "Los Angeles Angels" reads as a
 * mistake. Only musical acts keep it.
 *
 * Stage and sport are tested first on purpose. TicketNetwork's category for a
 * Broadway show is "MUSICAL / PLAY", which contains the substring "music", so
 * testing music first files every musical as a band. The same ordering trap
 * cost us a wrong category hint in the image resolver.
 * @param category - TicketNetwork category name, if known.
 * @returns True when the act is musical.
 */
export function isMusicCategory(category?: string): boolean {
  const lower = (category ?? '').toLowerCase();
  if (!lower) {
    return false;
  }

  if (/musical|play|broadway|west end|opera|cirque|vegas show|theat|ballet|dance|comedy/u.test(lower)) {
    return false;
  }
  if (/nfl|nba|mlb|nhl|mls|college|professional|sport|football|basketball|baseball|hockey|soccer|racing|rodeo/u.test(lower)) {
    return false;
  }

  return /rock|pop|alternative|country|folk|rap|hip hop|r&b|soul|metal|jazz|blues|latin|reggae|electronic|techno|new age|classical|concert|music|bluegrass|festival|era/u.test(lower);
}
