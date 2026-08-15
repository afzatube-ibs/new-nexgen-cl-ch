import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listOrders, getOrder, confirmOrder, startProcessingOrder, shipOrder, deliverOrder, cancelOrder, addOrderNote } from './orders.js';

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

  it('getOrder() unwraps the real DataEnvelope', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'o1', orderNumber: 'ORD-1' } }));

    const result = await getOrder(client, 'o1');

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/orders/o1');
    expect(result).toEqual({ id: 'o1', orderNumber: 'ORD-1' });
  });

  it('confirmOrder() posts the real expected_version body to the real transition endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'o1', status: 'confirmed' } }));

    await confirmOrder(client, 'o1', { expectedVersion: 3 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/orders/o1/confirm');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 3 });
  });

  it('startProcessingOrder() hits the real start-processing endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'o1', status: 'processing' } }));

    await startProcessingOrder(client, 'o1', { expectedVersion: 4 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/orders/o1/start-processing');
  });

  it('shipOrder() hits the real ship endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'o1', status: 'shipped' } }));

    await shipOrder(client, 'o1', { expectedVersion: 5 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/orders/o1/ship');
  });

  it('deliverOrder() hits the real deliver endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'o1', status: 'delivered' } }));

    await deliverOrder(client, 'o1', { expectedVersion: 6 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/orders/o1/deliver');
  });

  it('cancelOrder() posts both reason and expected_version to the real cancel endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'o1', status: 'cancelled' } }));

    await cancelOrder(client, 'o1', { reason: 'Customer changed their mind', expectedVersion: 2 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/orders/o1/cancel');
    expect(JSON.parse(init.body as string)).toEqual({ reason: 'Customer changed their mind', expected_version: 2 });
  });

  it('addOrderNote() posts body/is_customer_visible/expected_version to the real notes endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'n1', body: 'Called customer' } }, 201));

    await addOrderNote(client, 'o1', { body: 'Called customer', isCustomerVisible: false, expectedVersion: 1 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/orders/o1/notes');
    expect(JSON.parse(init.body as string)).toEqual({ body: 'Called customer', is_customer_visible: false, expected_version: 1 });
  });
});
