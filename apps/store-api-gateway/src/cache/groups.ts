/**
 * Cache Groups — a named collection of tags, purged together as one unit.
 * This slice's own requirement: "Cache Tags, Cache Groups, future purge-
 * by-tag." Tags themselves are already real (`lib/cacheStore.ts`'s
 * `invalidateTag`, Slice 1) — a Group is the operational convenience layer
 * on top: "purge everything catalog-related" without a caller needing to
 * enumerate every individual tag a route happens to use.
 */
import type { CacheStore } from '../lib/cacheStore.js';

const groups = new Map<string, string[]>();

export function defineCacheGroup(name: string, tags: string[]): void {
  groups.set(name, tags);
}

export function getCacheGroup(name: string): string[] | undefined {
  return groups.get(name);
}

export async function purgeCacheGroup(cache: CacheStore, name: string): Promise<{ purgedTags: string[] }> {
  const tags = groups.get(name) ?? [];
  await Promise.all(tags.map((tag) => cache.invalidateTag(tag)));
  return { purgedTags: tags };
}

// --- Starter groups, matching this slice's own real cache tags (routes/catalog.ts) ---
defineCacheGroup('catalog', ['catalog:products', 'catalog:categories', 'catalog:brands']);
defineCacheGroup('search', ['search', 'catalog:products']);
defineCacheGroup('homepage', ['catalog:categories', 'catalog:brands', 'catalog:products']);
