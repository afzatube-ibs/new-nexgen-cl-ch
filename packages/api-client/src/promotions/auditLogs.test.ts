import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listPromotionsAuditLogs } from './auditLogs.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('promotions auditLogs', () => {
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

  it('listPromotionsAuditLogs() maps actorId/targetType to the real query params, no target_id filter', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    await listPromotionsAuditLogs(client, { actorId: 'staff1', targetType: 'App\\Domains\\Commerce\\Promotions\\Models\\Promotion' });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/promotions/audit-logs?actor_id=staff1&target_type=App%5CDomains%5CCommerce%5CPromotions%5CModels%5CPromotion');
  });
});
