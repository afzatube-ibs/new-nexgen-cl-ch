import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listReturnRequests, getReturnRequest, createReturnRequest } from './returnRequests.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('returns returnRequests', () => {
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

  it('listReturnRequests() hits the real endpoint with genuinely server-side status/order_id/customer_id filters', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } }));

    await listReturnRequests(client, { status: 'requested', orderId: 'o1', customerId: 'c1', page: 1 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/return-requests?status=requested&order_id=o1&customer_id=c1&page=1');
  });

  it('getReturnRequest() hits the real show endpoint — the one that loads items/timeline/notes/refundRequest/exchangeRequest', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'r1', orderId: 'o1', items: [], timeline: [], notes: [] } }));

    await getReturnRequest(client, 'r1');

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/return-requests/r1');
  });

  it('createReturnRequest() posts order_id/customer_id/reason/items, omitting type when not supplied', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'r1' } }, 201));

    await createReturnRequest(client, {
      orderId: 'o1',
      customerId: 'c1',
      reason: 'damaged',
      items: [{ sku: 'SKU-1', quantity: 2 }],
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/return-requests');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({
      order_id: 'o1',
      customer_id: 'c1',
      reason: 'damaged',
      items: [{ sku: 'SKU-1', quantity: 2 }],
    });
    expect('type' in body).toBe(false);
  });

  it('createReturnRequest() passes type through when supplied', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'r1' } }, 201));

    await createReturnRequest(client, {
      orderId: 'o1',
      customerId: 'c1',
      type: 'exchange',
      reason: 'wrong_item',
      items: [{ sku: 'SKU-1', quantity: 1 }],
    });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.type).toBe('exchange');
  });
});
