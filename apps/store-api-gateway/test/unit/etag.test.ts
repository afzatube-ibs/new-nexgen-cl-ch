import { describe, expect, it } from 'vitest';
import { computeEtag, etagMatches } from '../../src/lib/etag.js';

describe('lib/etag', () => {
  it('produces the same ETag for identical bodies', () => {
    const a = computeEtag({ name: 'Widget', price: 10 });
    const b = computeEtag({ name: 'Widget', price: 10 });
    expect(a).toBe(b);
  });

  it('produces a different ETag when the body changes', () => {
    const a = computeEtag({ name: 'Widget' });
    const b = computeEtag({ name: 'Gadget' });
    expect(a).not.toBe(b);
  });

  it('matches when If-None-Match contains the current ETag', () => {
    const etag = computeEtag({ x: 1 });
    expect(etagMatches(etag, etag)).toBe(true);
  });

  it('matches a wildcard If-None-Match', () => {
    expect(etagMatches('*', computeEtag({ x: 1 }))).toBe(true);
  });

  it('does not match a stale ETag', () => {
    const current = computeEtag({ x: 2 });
    expect(etagMatches('W/"stale-value-here-000"', current)).toBe(false);
  });

  it('does not match when no If-None-Match header was sent', () => {
    expect(etagMatches(undefined, computeEtag({ x: 1 }))).toBe(false);
  });
});
