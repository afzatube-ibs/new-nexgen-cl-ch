import { describe, expect, it } from 'vitest';
import { resolveIdentifierKind } from '../../src/backend/identifier.js';
import { extractUtmParameters } from '../../src/personalization/attribution.js';
import { classifyDevice } from '../../src/personalization/device.js';
import { getCacheGroup, purgeCacheGroup } from '../../src/cache/groups.js';
import { createInMemoryCacheStore } from '../../src/lib/cacheStore.js';

describe('backend/identifier', () => {
  it('classifies a real UUID as uuid', () => {
    expect(resolveIdentifierKind('019fe82d-0e24-7301-9426-14ec19f772c3')).toBe('uuid');
  });

  it('classifies a human-readable slug as slug', () => {
    expect(resolveIdentifierKind('premium-wireless-headphones')).toBe('slug');
  });

  it('is case-insensitive for the UUID pattern', () => {
    expect(resolveIdentifierKind('019FE82D-0E24-7301-9426-14EC19F772C3')).toBe('uuid');
  });
});

describe('personalization/attribution', () => {
  it('extracts every named UTM/click-id field, per CDP_ARCHITECTURE.md §7.2', () => {
    const result = extractUtmParameters({ utm_source: 'google', utm_medium: 'cpc', gclid: 'abc123' });
    expect(result.utmSource).toBe('google');
    expect(result.utmMedium).toBe('cpc');
    expect(result.gclid).toBe('abc123');
    expect(result.fbclid).toBeNull();
  });

  it('returns null for every field when no attribution params are present', () => {
    const result = extractUtmParameters({});
    expect(Object.values(result).every((v) => v === null)).toBe(true);
  });
});

describe('personalization/device', () => {
  it('classifies a mobile Safari UA as mobile', () => {
    expect(classifyDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15').type).toBe('mobile');
  });

  it('classifies an iPad UA as tablet', () => {
    expect(classifyDevice('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15').type).toBe('tablet');
  });

  it('classifies a desktop Chrome UA as desktop', () => {
    expect(classifyDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36').type).toBe('desktop');
  });

  it('flags a known crawler UA as a bot', () => {
    expect(classifyDevice('Mozilla/5.0 (compatible; Googlebot/2.1)').isBot).toBe(true);
  });

  it('returns unknown for a missing UA rather than guessing', () => {
    expect(classifyDevice(undefined)).toEqual({ type: 'unknown', isBot: false });
  });
});

describe('cache/groups', () => {
  it('the starter "catalog" group exists and purging it invalidates exactly its own tags', async () => {
    const cache = createInMemoryCacheStore();
    await cache.set('product:1', 'a', 60, ['catalog:products']);
    await cache.set('brand:1', 'b', 60, ['catalog:brands']);
    await cache.set('unrelated:1', 'c', 60, ['search']);

    expect(getCacheGroup('catalog')).toEqual(['catalog:products', 'catalog:categories', 'catalog:brands']);

    const { purgedTags } = await purgeCacheGroup(cache, 'catalog');
    expect(purgedTags).toContain('catalog:products');

    expect(await cache.get('product:1')).toBeNull();
    expect(await cache.get('brand:1')).toBeNull();
    expect(await cache.get('unrelated:1')).toBe('c');
  });

  it('purging an unknown group is a safe no-op, never an error', async () => {
    const cache = createInMemoryCacheStore();
    const { purgedTags } = await purgeCacheGroup(cache, 'does-not-exist');
    expect(purgedTags).toEqual([]);
  });
});
