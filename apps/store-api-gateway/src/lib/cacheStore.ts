/**
 * Redis-backed cache abstraction — STORE_API_GATEWAY_ARCHITECTURE.md §4 /
 * STORE_FRONTEND_ARCHITECTURE.md §4's "BFF response cache... tagged by
 * entity" layer. Uses ADR-0004's already-Accepted Redis backbone (the same
 * instance the backend already runs against, on its own key prefix so the
 * two never collide) — no new infrastructure decision required.
 *
 * "Future invalidation hooks" (this phase's own stated scope) is the
 * `invalidateTag` method below: a real, callable method today, a no-op
 * beyond deleting its own tag's keys until a real webhook-driven push
 * (STORE_FRONTEND_ARCHITECTURE.md §4 item 1) exists to call it from outside
 * this process.
 *
 * Per ENGINEERING:RESILIENCE's graceful-degradation principle: if Redis is
 * unreachable, every read is treated as a cache miss and every write is a
 * silent no-op — a caching-layer outage must never take the Gateway itself
 * down, only its cache hit rate.
 */
import { Redis } from 'ioredis';
import type { FastifyBaseLogger } from 'fastify';

export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number, tags?: string[]): Promise<void>;
  del(key: string): Promise<void>;
  /** Invalidates every key written with this tag. See docblock above. */
  invalidateTag(tag: string): Promise<void>;
  isAvailable(): boolean;
  close(): Promise<void>;
}

export function createRedisCacheStore(url: string, keyPrefix: string, logger: FastifyBaseLogger): CacheStore {
  let available = true;

  const client = new Redis(url, {
    keyPrefix,
    lazyConnect: false,
    retryStrategy: (times: number) => Math.min(times * 200, 2000),
    maxRetriesPerRequest: 1,
  });

  client.on('error', (error: Error) => {
    if (available) {
      logger.warn({ err: error }, 'Gateway cache store: Redis connection error — degrading to cache-miss mode');
    }
    available = false;
  });

  client.on('ready', () => {
    if (!available) logger.info('Gateway cache store: Redis connection recovered');
    available = true;
  });

  const tagKey = (tag: string) => `tag:${tag}`;

  return {
    isAvailable: () => available,

    async get(key) {
      if (!available) return null;
      try {
        return await client.get(key);
      } catch (error) {
        logger.warn({ err: error, key }, 'Gateway cache store: read failed, treating as miss');
        return null;
      }
    },

    async set(key, value, ttlSeconds, tags = []) {
      if (!available) return;
      try {
        await client.set(key, value, 'EX', ttlSeconds);
        for (const tag of tags) {
          await client.sadd(tagKey(tag), key);
          await client.expire(tagKey(tag), ttlSeconds);
        }
      } catch (error) {
        logger.warn({ err: error, key }, 'Gateway cache store: write failed, ignoring');
      }
    },

    async del(key) {
      if (!available) return;
      try {
        await client.del(key);
      } catch (error) {
        logger.warn({ err: error, key }, 'Gateway cache store: delete failed, ignoring');
      }
    },

    async invalidateTag(tag) {
      if (!available) return;
      try {
        const keys = await client.smembers(tagKey(tag));
        if (keys.length > 0) {
          await client.del(...keys);
        }
        await client.del(tagKey(tag));
      } catch (error) {
        logger.warn({ err: error, tag }, 'Gateway cache store: tag invalidation failed, ignoring');
      }
    },

    async close() {
      await client.quit();
    },
  };
}

/** In-memory fallback used by unit/integration tests — never used at runtime. */
export function createInMemoryCacheStore(): CacheStore {
  const store = new Map<string, { value: string; expiresAt: number }>();
  const tags = new Map<string, Set<string>>();

  return {
    isAvailable: () => true,
    get(key) {
      const entry = store.get(key);
      if (!entry) return Promise.resolve(null);
      if (entry.expiresAt < Date.now()) {
        store.delete(key);
        return Promise.resolve(null);
      }
      return Promise.resolve(entry.value);
    },
    set(key, value, ttlSeconds, keyTags = []) {
      store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
      for (const tag of keyTags) {
        if (!tags.has(tag)) tags.set(tag, new Set());
        tags.get(tag)!.add(key);
      }
      return Promise.resolve();
    },
    del(key) {
      store.delete(key);
      return Promise.resolve();
    },
    invalidateTag(tag) {
      for (const key of tags.get(tag) ?? []) store.delete(key);
      tags.delete(tag);
      return Promise.resolve();
    },
    close() {
      store.clear();
      return Promise.resolve();
    },
  };
}
