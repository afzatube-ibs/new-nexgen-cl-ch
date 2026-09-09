import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTestApp, stubBackendFetch, testEnv } from './testUtils.js';

describe('storefront inventory availability', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns only shopper-safe in/out-of-stock state', async () => {
    stubBackendFetch([
      {
        match: 'inventory/availability-many',
        status: 200,
        body: {
          data: [
            { sku: 'SKU-1', totalAvailable: 5 },
            { sku: 'SKU-2', totalAvailable: 0 },
          ],
        },
      },
    ]);

    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: '/v1/inventory/availability?skus=SKU-1,SKU-2' });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([
      { sku: 'SKU-1', isAvailable: true },
      { sku: 'SKU-2', isAvailable: false },
    ]);
    expect(response.body).not.toContain('totalAvailable');
    expect(response.body).not.toContain('warehouse');

    await app.close();
  });

  it('degrades inventory failures to unknown instead of failing catalog browsing', async () => {
    stubBackendFetch([
      {
        match: 'inventory/availability-many',
        status: 503,
        body: { error: { code: 'upstream_unavailable', message: 'Inventory unavailable' } },
      },
    ]);

    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: '/v1/inventory/availability?skus=SKU-1' });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([{ sku: 'SKU-1', isAvailable: null }]);

    await app.close();
  });
});
