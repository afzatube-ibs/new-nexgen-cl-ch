import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { addShipmentItem, removeShipmentItem } from './items.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('fulfillment items', () => {
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

  it('addShipmentItem() posts to the real endpoint with the exact snake_case AddShipmentItemRequest fields', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'item1', sku: 'SKU-001', description: 'Cotton T-Shirt', quantity: 2 } }, 201));

    await addShipmentItem(client, 's1', { sku: 'SKU-001', description: 'Cotton T-Shirt', quantity: 2 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipments/s1/items');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ sku: 'SKU-001', description: 'Cotton T-Shirt', quantity: 2 });
  });

  it('addShipmentItem() omits description entirely when not supplied', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'item1', sku: 'SKU-001', description: null, quantity: 1 } }, 201));

    await addShipmentItem(client, 's1', { sku: 'SKU-001', quantity: 1 });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect('description' in body).toBe(false);
  });

  it('removeShipmentItem() deletes the real item endpoint', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await removeShipmentItem(client, 's1', 'item1');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipments/s1/items/item1');
    expect(init.method).toBe('DELETE');
  });
});
