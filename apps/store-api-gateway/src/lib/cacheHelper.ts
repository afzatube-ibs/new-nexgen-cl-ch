/**
 * Composes the Cache pipeline stage (STORE_API_GATEWAY_ARCHITECTURE.md §4 /
 * STORE_FRONTEND_ARCHITECTURE.md §4) for every Category-A read route:
 * check the shared Redis-backed store first (cheap, no locale/session
 * resolution needed since Category-A data does not vary by visitor
 * identity — only by the request's own resolved locale/currency/query,
 * already fully determined by the request itself); on a hit, respond
 * immediately; on a miss, let the caller compute the real value, then
 * store it, tagged for future invalidation (CacheStore.invalidateTag).
 *
 * Real stale-while-revalidate (this Slice 1.5's own requirement, beyond
 * Slice 1's binary HIT/MISS): a stored value now carries its own
 * `storedAt`. Within `ttlSeconds` it is fresh (HIT, served as-is). Within
 * the following `staleWhileRevalidateSeconds` window it is STALE — still
 * served immediately (a visitor is never made to wait on a recompute),
 * while a background recompute is kicked off, fire-and-forget, to refresh
 * the value for the next request. Past both windows it is a genuine MISS,
 * recomputed synchronously as Slice 1 already did.
 *
 * ETag/If-None-Match (HTTP Cache) is layered on top of the same computed
 * body regardless of which of the three states served it — a 304 is
 * possible on a MISS too, if the visitor's own browser cache already has
 * the (now server-recomputed, byte-identical) body.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { computeEtag, etagMatches } from './etag.js';
import type { CacheStore } from './cacheStore.js';
import { envelope, type PaginationMeta } from './responseEnvelope.js';

export interface CacheableOptions {
  key: string;
  /** How long a stored value is considered fully fresh. */
  ttlSeconds: number;
  /** Additional window after `ttlSeconds` during which a stale value is still served while a background recompute refreshes it. Defaults to 0 (no SWR — an exact Slice 1-compatible MISS the instant ttlSeconds elapses). */
  staleWhileRevalidateSeconds?: number;
  tags?: string[];
  /** Cache-Control max-age communicated to the browser/CDN layer — independent of, and typically shorter than, the server-side Redis ttlSeconds. */
  browserMaxAgeSeconds?: number;
}

interface StoredEnvelope<T> {
  data: T;
  pagination?: PaginationMeta;
  storedAt: number;
}

/** Guards against launching a second background recompute for the same key while one is already in flight — a best-effort, single-process optimization, not a distributed lock; an occasional duplicate recompute across processes is harmless, never incorrect. */
const inFlightRevalidations = new Set<string>();

export async function serveCacheable<T>(
  request: FastifyRequest,
  reply: FastifyReply,
  cache: CacheStore,
  options: CacheableOptions,
  compute: () => Promise<{ data: T; pagination?: PaginationMeta }>,
): Promise<void> {
  const staleWindowSeconds = options.staleWhileRevalidateSeconds ?? 0;
  const raw = await cache.get(options.key);

  let cacheStatus: 'HIT' | 'MISS' | 'STALE';
  let body: { data: T; pagination?: PaginationMeta };

  if (raw) {
    const stored = JSON.parse(raw) as StoredEnvelope<T>;
    const ageSeconds = (Date.now() - stored.storedAt) / 1000;

    if (ageSeconds <= options.ttlSeconds) {
      cacheStatus = 'HIT';
      body = stored;
    } else if (ageSeconds <= options.ttlSeconds + staleWindowSeconds) {
      cacheStatus = 'STALE';
      body = stored;
      void revalidateInBackground(options, cache, compute);
    } else {
      cacheStatus = 'MISS';
      body = await computeAndStore(options, cache, compute);
    }
  } else {
    cacheStatus = 'MISS';
    body = await computeAndStore(options, cache, compute);
  }

  const responseBody = envelope(body.data, {
    requestId: request.id,
    cache: cacheStatus,
    pagination: body.pagination,
  });

  const etag = computeEtag(responseBody.data);
  const ifNoneMatch = readIfNoneMatch(request.headers['if-none-match']);
  reply.header('ETag', etag);
  reply.header('Cache-Control', `public, max-age=${options.browserMaxAgeSeconds ?? 60}, stale-while-revalidate=${staleWindowSeconds}`);
  reply.header('X-Cache-Status', cacheStatus);

  if (etagMatches(ifNoneMatch, etag)) {
    reply.code(304);
    return reply.send();
  }

  reply.code(200);
  return reply.send(responseBody);
}

async function computeAndStore<T>(
  options: CacheableOptions,
  cache: CacheStore,
  compute: () => Promise<{ data: T; pagination?: PaginationMeta }>,
): Promise<StoredEnvelope<T>> {
  const computed = await compute();
  const stored: StoredEnvelope<T> = { ...computed, storedAt: Date.now() };
  const staleWindowSeconds = options.staleWhileRevalidateSeconds ?? 0;
  await cache.set(options.key, JSON.stringify(stored), options.ttlSeconds + staleWindowSeconds, options.tags);
  return stored;
}

async function revalidateInBackground<T>(
  options: CacheableOptions,
  cache: CacheStore,
  compute: () => Promise<{ data: T; pagination?: PaginationMeta }>,
): Promise<void> {
  if (inFlightRevalidations.has(options.key)) return;
  inFlightRevalidations.add(options.key);
  try {
    await computeAndStore(options, cache, compute);
  } catch {
    // A failed background revalidation leaves the still-valid stale value
    // in place — never surfaces to the visitor who triggered it.
  } finally {
    inFlightRevalidations.delete(options.key);
  }
}

/** Narrows a raw header value (which Fastify types loosely) to a single string, isolated in its own function so one `unknown`-boundary cast doesn't leak `any` into the caller's own type inference. */
function readIfNoneMatch(headerValue: unknown): string | undefined {
  if (typeof headerValue === 'string') return headerValue;
  if (Array.isArray(headerValue) && typeof headerValue[0] === 'string') return headerValue[0];
  return undefined;
}

/** Deterministic cache key from route + normalized query params — never includes guest/session identity, per this module's own docblock. */
export function buildCacheKey(routeName: string, params: Record<string, string | number | undefined>): string {
  const sortedEntries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  const suffix = sortedEntries.map(([key, value]) => `${key}=${value}`).join('&');
  return suffix ? `${routeName}?${suffix}` : routeName;
}
