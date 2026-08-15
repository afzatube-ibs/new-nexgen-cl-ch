import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listOrderAuditLogs } from './auditLogs.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('orders auditLogs', () => {
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

  it('listOrderAuditLogs() hits the real endpoint with real target_type/actor_id filters — no target_id support to invent', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    await listOrderAuditLogs(client, { targetType: 'App\\Domains\\Commerce\\Orders\\Models\\Order', actorId: 'u1', page: 1, perPage: 25 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      'https://api.test/orders/audit-logs?actor_id=u1&target_type=App%5CDomains%5CCommerce%5COrders%5CModels%5COrder&page=1&per_page=25',
    );
  });
});
