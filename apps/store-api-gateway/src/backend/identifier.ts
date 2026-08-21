/**
 * Product/Category/Brand identifier classification — the Gateway-side
 * seam GATEWAY_SLUG_READINESS.md §5 names: real, tested today; not yet
 * wired to a live slug-fetch path, since the backend `?slug=` filter that
 * would serve it (that document's own §3 Option A) does not exist yet.
 * Isolating this decision here means the day it does, exactly one call
 * site per route changes — never a redesign of routing/caching/
 * composition around it.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type IdentifierKind = 'uuid' | 'slug';

export function resolveIdentifierKind(value: string): IdentifierKind {
  return UUID_PATTERN.test(value) ? 'uuid' : 'slug';
}
