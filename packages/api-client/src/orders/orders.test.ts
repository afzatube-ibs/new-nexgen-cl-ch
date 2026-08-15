import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listOrders } from './orders.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('orders', () => {
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

  it('listOrders() hits the real endpoint with a real customer_id filter — genuinely server-side, not client-filtered', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } }));

    await listOrders(client, { customerId: 'c1', page: 1 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/orders?customer_id=c1&page=1');
  });

  it('listOrders() maps status and q through to the real query params', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    await listOrders(client, { status: 'shipped', q: 'ORD-1' });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/orders?status=shipped&q=ORD-1');
  });
});
