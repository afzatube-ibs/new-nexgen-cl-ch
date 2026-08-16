import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listShipments, getShipment } from './shipments.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('fulfillment shipments', () => {
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

  it('listShipments() hits the real endpoint with a real order_id filter — genuinely server-side, not client-filtered', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } }));

    await listShipments(client, { orderId: 'o1', page: 1 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipments?order_id=o1&page=1');
  });

  it('listShipments() maps status through to the real query param', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    await listShipments(client, { status: 'dispatched' });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipments?status=dispatched');
  });

  it('getShipment() hits the real show endpoint — the only one that loads items/timeline/notes', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 's1', orderId: 'o1', items: [], timeline: [], notes: [] } }));

    await getShipment(client, 's1');

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipments/s1');
  });
});
