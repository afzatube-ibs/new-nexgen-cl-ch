/**
 * Composite "id-slug" URL segments — the real fix for a genuine
 * architectural gap discovered during this milestone's own implementation
 * (recorded as a Change Log entry in `docs/frontend/STORE_FRONTEND_
 * ARCHITECTURE.md` §1.1): that document's own routing scheme specifies
 * pure `/products/[slug]`-shaped URLs, but the real backend has no
 * slug-based lookup at all (`planning/architecture/
 * GATEWAY_SLUG_READINESS.md`) — the Gateway's own `/v1/products/:id`,
 * `/v1/categories/:id`, `/v1/brands/:id` routes only accept the real UUID,
 * and correctly return a `501` for anything slug-shaped
 * (`assertUuidSupported`, Slice 1.5).
 *
 * Rather than either (a) routing by bare UUID — honest, but a materially
 * worse SEO URL than the architecture always intended — or (b) fabricating
 * a slug→id lookup that would require fetching every product just to
 * resolve one route param — this app uses the same composite-segment
 * pattern Amazon/eBay/Etsy already use for the identical constraint
 * ("a readable slug in the URL, a real id doing the actual lookup"):
 * `/products/{id}-{slug}`. The id is authoritative and is all this app
 * ever sends to the Gateway; the slug exists purely for the human/SEO-
 * readable portion of the URL and is never parsed for correctness — a
 * mismatched or stale slug in an old bookmarked URL still resolves
 * correctly, exactly like the same pattern on those reference sites.
 *
 * The day the backend gains a real `?slug=` filter
 * (`GATEWAY_SLUG_READINESS.md` §3 Option A), this file's own two functions
 * are the only place that would need to change — every route/page that
 * calls them does not.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Slugifies a name the same way every other slug in this platform is generated (lowercase, non-alphanumeric runs collapsed to a single hyphen, no leading/trailing hyphen) — used only to build a human-readable URL segment, never to derive an id. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Builds the composite `{id}-{slug}` URL segment for an entity's own detail route. */
export function buildIdSlugSegment(id: string, name: string): string {
  const slug = slugify(name);
  return slug ? `${id}-${slug}` : id;
}

/**
 * Extracts the authoritative id from a `{id}-{slug}` (or bare-id) URL
 * segment. A real UUID is always exactly 36 characters — the first 36
 * characters of the segment are checked first (the common, fast path);
 * falls back to treating the whole segment as the id (a bare-id URL, or a
 * malformed one) so a caller always gets *a* string to pass to the Gateway
 * and lets the Gateway's own `assertUuidSupported` produce the correct,
 * honest error if it genuinely isn't a real id — this function never
 * itself decides a segment is invalid.
 */
export function extractIdFromSegment(segment: string): string {
  const candidate = segment.slice(0, 36);
  return UUID_PATTERN.test(candidate) ? candidate : segment;
}
