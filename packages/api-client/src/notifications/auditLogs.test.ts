import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listNotificationsAuditLogs } from './auditLogs.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('notifications audit logs', () => {
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

  it('listNotificationsAuditLogs() hits the real, distinct notification-audit-logs path', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));
    await listNotificationsAuditLogs(client, { actorId: 'u1', perPage: 25 });
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/notification-audit-logs?actor_id=u1&per_page=25');
  });
});
