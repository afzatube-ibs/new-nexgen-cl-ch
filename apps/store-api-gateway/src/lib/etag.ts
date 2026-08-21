/**
 * ETag generation for the Gateway's own HTTP cache layer
 * (STORE_API_GATEWAY_ARCHITECTURE.md §4 / STORE_FRONTEND_ARCHITECTURE.md
 * §4). A weak ETag (content-hash based) is sufficient here — this Gateway
 * never needs byte-for-byte identity guarantees, only "did the shaped
 * response body actually change."
 */
import { createHash } from 'node:crypto';

export function computeEtag(body: unknown): string {
  const serialized = JSON.stringify(body);
  const hash = createHash('sha256').update(serialized).digest('hex').slice(0, 27);
  return `W/"${hash}"`;
}

export function etagMatches(ifNoneMatch: string | undefined, etag: string): boolean {
  if (!ifNoneMatch) return false;
  return ifNoneMatch
    .split(',')
    .map((value) => value.trim())
    .some((value) => value === etag || value === '*');
}
