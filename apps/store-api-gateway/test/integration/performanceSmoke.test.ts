import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTestApp, stubBackendFetch, testEnv } from './testUtils.js';

/**
 * Performance SMOKE test only — per TESTING:PERFORMANCE_TESTING's
 * already-Accepted "a performance claim with no corresponding performance
 * test is not yet a verified claim" standard, and PERFORMANCE_FOUNDATION.md's
 * own explicit "no numeric budget without a real build to measure against"
 * discipline: this asserts the Gateway's own request-handling overhead
 * stays within a generous, environment-tolerant bound in an in-process test
 * (`.inject()`, no real network hop) — it is NOT a production latency SLA,
 * and the Slice 1 report says so explicitly.
 */
describe('Performance smoke test', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('serves a cached (post-warmup) Category-A response in well under 50ms of in-process handling time', async () => {
    stubBackendFetch([{ match: '/categories', status: 200, body: { data: [] } }]);
    const app = await buildTestApp(testEnv());

    await app.inject({ method: 'GET', url: '/v1/categories' }); // warm the cache

    const start = performance.now();
    const response = await app.inject({ method: 'GET', url: '/v1/categories' });
    const elapsedMs = performance.now() - start;

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-cache-status']).toBe('HIT');
    expect(elapsedMs).toBeLessThan(50);

    await app.close();
  });

  it('handles 20 concurrent Category-A requests without error', async () => {
    stubBackendFetch([{ match: '/brands', status: 200, body: { data: [] } }]);
    const app = await buildTestApp(testEnv({ RATE_LIMIT_MAX: '100' }));

    const results = await Promise.all(Array.from({ length: 20 }, () => app.inject({ method: 'GET', url: '/v1/brands' })));
    expect(results.every((r) => r.statusCode === 200)).toBe(true);

    await app.close();
  });
});
