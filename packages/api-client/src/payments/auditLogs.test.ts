import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listPaymentAuditLogs } from './auditLogs.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('payments auditLogs', () => {
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

  it('listPaymentAuditLogs() hits the real endpoint with actor_id/target_type/page/per_page — no target_id filter', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1 } }));

    await listPaymentAuditLogs(client, { actorId: 'u1', page: 1, perPage: 25 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/payments/audit-logs?actor_id=u1&page=1&per_page=25');
  });
});
