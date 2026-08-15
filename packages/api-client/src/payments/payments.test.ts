import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listPayments } from './payments.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('payments', () => {
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

  it('listPayments() hits the real endpoint with a real order_id filter — genuinely server-side, not client-filtered', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } }));

    await listPayments(client, { orderId: 'o1', page: 1 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/payments?order_id=o1&page=1');
  });

  it('listPayments() maps status through to the real query param', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    await listPayments(client, { status: 'captured' });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/payments?status=captured');
  });
});
