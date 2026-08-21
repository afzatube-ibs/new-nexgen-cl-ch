import { describe, expect, it, vi } from 'vitest';
import { createInMemoryCacheStore } from '../../src/lib/cacheStore.js';

describe('lib/cacheStore (in-memory fallback)', () => {
  it('returns null for a key that was never set', async () => {
    const cache = createInMemoryCacheStore();
    expect(await cache.get('missing')).toBeNull();
  });

  it('round-trips a value within its TTL', async () => {
    const cache = createInMemoryCacheStore();
    await cache.set('key-1', 'value-1', 60);
    expect(await cache.get('key-1')).toBe('value-1');
  });

  it('expires a value after its TTL elapses', async () => {
    vi.useFakeTimers();
    const cache = createInMemoryCacheStore();
    await cache.set('key-1', 'value-1', 1);
    vi.advanceTimersByTime(1500);
    expect(await cache.get('key-1')).toBeNull();
    vi.useRealTimers();
  });

  it('invalidates every key sharing a tag, and only those keys', async () => {
    const cache = createInMemoryCacheStore();
    await cache.set('product:1', 'a', 60, ['catalog:products']);
    await cache.set('product:2', 'b', 60, ['catalog:products']);
    await cache.set('brand:1', 'c', 60, ['catalog:brands']);

    await cache.invalidateTag('catalog:products');

    expect(await cache.get('product:1')).toBeNull();
    expect(await cache.get('product:2')).toBeNull();
    expect(await cache.get('brand:1')).toBe('c'); // untagged-by-this-tag key survives
  });

  it('reports itself as always available (no real network dependency to degrade)', () => {
    expect(createInMemoryCacheStore().isAvailable()).toBe(true);
  });
});
