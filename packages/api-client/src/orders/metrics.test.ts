import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { getOrderMetrics, getTopSellingProducts } from './metrics.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('orders metrics', () => {
  const fetchMock = vi.fn();
  let client: ApiClient;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    client = new ApiClient({ baseUrl: 'https://api.test', getToken: () => null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getOrderMetrics() hits the real summary endpoint and returns the data envelope', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          pendingOrders: 3,
          ordersToday: 2,
          ordersThisMonth: 10,
          revenueToday: [{ currencyCode: 'USD', amount: '150.0000' }],
          revenueThisMonth: [{ currencyCode: 'USD', amount: '900.0000' }],
        },
      }),
    );

    const result = await getOrderMetrics(client);

    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/orders/metrics');
    expect(result.pendingOrders).toBe(3);
    expect(result.revenueToday).toEqual([{ currencyCode: 'USD', amount: '150.0000' }]);
  });

  it('getTopSellingProducts() hits the real top-products endpoint with a real limit param', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [{ sku: 'SKU-1', productName: 'Widget', totalQuantity: 42 }] }));

    const result = await getTopSellingProducts(client, { limit: 3 });

    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/orders/top-products?limit=3');
    expect(result).toEqual([{ sku: 'SKU-1', productName: 'Widget', totalQuantity: 42 }]);
  });

  it('getTopSellingProducts() omits the limit param when not supplied', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    await getTopSellingProducts(client);

    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/orders/top-products');
  });
});
