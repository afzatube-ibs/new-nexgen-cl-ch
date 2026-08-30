import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listPayments, getPayment, listPaymentMethods } from './payments.js';

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

  it('getPayment() hits the real show() endpoint and unwraps the data envelope', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'p1', attempts: [] } }));

    const result = await getPayment(client, 'p1');

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/payments/p1');
    expect(result).toEqual({ id: 'p1', attempts: [] });
  });

  it('listPaymentMethods() hits the real gateway registry endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [{ code: 'cod', label: 'Cash On Delivery', available: true }] }));

    await listPaymentMethods(client);

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/payments/methods');
  });

  it('listPaymentMethods({ all: true }) requests every registered gateway, not only available ones', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [{ code: 'sslcommerz', label: 'SSLCommerz', available: false }] }));

    await listPaymentMethods(client, { all: true });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/payments/methods?all=1');
  });
});
