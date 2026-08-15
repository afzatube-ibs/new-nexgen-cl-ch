import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listCustomerAuditLogs, CUSTOMER_TARGET_TYPE } from './auditLogs.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('customers auditLogs', () => {
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

  it('listCustomerAuditLogs() hits the real endpoint, encoding the fully-qualified target_type class string', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } }));

    await listCustomerAuditLogs(client, { targetType: CUSTOMER_TARGET_TYPE, page: 1, perPage: 25 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      `https://api.test/customers/audit-logs?target_type=${encodeURIComponent(CUSTOMER_TARGET_TYPE)}&page=1&per_page=25`,
    );
  });

  it('listCustomerAuditLogs() has no target_id filter — this endpoint genuinely cannot be scoped to one customer server-side', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    await listCustomerAuditLogs(client, { actorId: 'u1' });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/customers/audit-logs?actor_id=u1');
    expect(url).not.toContain('target_id');
  });
});
