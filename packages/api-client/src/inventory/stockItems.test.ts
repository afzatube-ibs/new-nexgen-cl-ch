import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { adjustStock, listStockItems, listStockItemAdjustments } from './stockItems.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('stockItems', () => {
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

  it('adjustStock() maps camelCase input to the exact snake_case AdjustStockRequest fields', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: { id: '1', warehouseId: 'w1', sku: 'SKU-1', quantityOnHand: 10, quantityReserved: 0, quantityAvailable: 10, version: 1, createdAt: null, updatedAt: null },
      }),
    );

    await adjustStock(client, { warehouseId: 'w1', sku: 'SKU-1', quantityDelta: -3, reason: 'Damaged / written off' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/stock-items/adjust');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      warehouse_id: 'w1',
      sku: 'SKU-1',
      quantity_delta: -3,
      reason: 'Damaged / written off',
    });
  });

  it('listStockItems() maps warehouseId/sku to snake_case query params', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1 } }));

    await listStockItems(client, { warehouseId: 'w1', sku: 'SKU-1', page: 2 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/stock-items?warehouse_id=w1&sku=SKU-1&page=2');
  });

  it('listStockItems() maps quantityLte to the real quantity_lte query param, for the Low Stock dashboard widget', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1 } }));

    await listStockItems(client, { quantityLte: 10 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/stock-items?quantity_lte=10');
  });

  it('listStockItemAdjustments() hits the per-item ledger endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1 } }));

    await listStockItemAdjustments(client, 'item-1', { page: 1 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/stock-items/item-1/adjustments?page=1');
  });
});
