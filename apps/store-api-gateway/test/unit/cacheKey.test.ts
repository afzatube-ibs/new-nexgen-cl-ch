import { describe, expect, it } from 'vitest';
import { buildCacheKey } from '../../src/lib/cacheHelper.js';

describe('lib/cacheHelper buildCacheKey', () => {
  it('builds a deterministic key regardless of param insertion order', () => {
    const a = buildCacheKey('products', { page: 2, per_page: 25 });
    const b = buildCacheKey('products', { per_page: 25, page: 2 });
    expect(a).toBe(b);
  });

  it('omits undefined/empty params rather than embedding them literally', () => {
    const key = buildCacheKey('categories', { locale: 'en', currency: undefined, q: '' });
    expect(key).toBe('categories?locale=en');
  });

  it('produces a bare route name when there are no params', () => {
    expect(buildCacheKey('homepage', {})).toBe('homepage');
  });

  it('never includes guest/session identity — same params, same key regardless of caller', () => {
    // This test documents the architectural invariant itself
    // (STORE_API_GATEWAY_ARCHITECTURE.md §4): buildCacheKey's own
    // signature has no identity parameter to pass in the first place.
    const key1 = buildCacheKey('products/abc', {});
    const key2 = buildCacheKey('products/abc', {});
    expect(key1).toBe(key2);
  });
});
