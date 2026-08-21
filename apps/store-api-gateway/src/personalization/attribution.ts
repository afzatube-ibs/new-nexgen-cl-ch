/**
 * UTM/click-id extraction — CDP_ARCHITECTURE.md §7.2's own attribution
 * field set, implemented for real: "utm_source/medium/campaign/term/
 * content, fbclid, gclid, ttclid, wbraid, gbraid... fbc/fbp." Read from
 * the request's own query string — the session-persistence half of §7.2
 * ("captured once per session... threaded via sessionId") is Category-B/
 * CDP-session-storage work, out of this slice's own read-only scope;
 * this function is the pure, stateless extraction step that persistence
 * will eventually wrap.
 */

export interface UtmParameters {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  fbclid: string | null;
  gclid: string | null;
  ttclid: string | null;
  wbraid: string | null;
  gbraid: string | null;
}

export function extractUtmParameters(query: Record<string, string | string[] | undefined>): UtmParameters {
  const one = (key: string): string | null => {
    const value = query[key];
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  };

  return {
    utmSource: one('utm_source'),
    utmMedium: one('utm_medium'),
    utmCampaign: one('utm_campaign'),
    utmTerm: one('utm_term'),
    utmContent: one('utm_content'),
    fbclid: one('fbclid'),
    gclid: one('gclid'),
    ttclid: one('ttclid'),
    wbraid: one('wbraid'),
    gbraid: one('gbraid'),
  };
}
