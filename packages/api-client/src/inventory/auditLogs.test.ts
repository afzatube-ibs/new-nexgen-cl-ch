import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listInventoryAuditLogs } from './auditLogs.js';
import { INVENTORY_STOCK_ITEM_TARGET_TYPE } from './types.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('auditLogs', () => {
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

  it('listInventoryAuditLogs() maps targetType to the snake_case target_type param', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1 } }));

    await listInventoryAuditLogs(client, { targetType: INVENTORY_STOCK_ITEM_TARGET_TYPE, page: 1 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`https://api.test/inventory/audit-logs?target_type=${encodeURIComponent(INVENTORY_STOCK_ITEM_TARGET_TYPE)}&page=1`);
  });

  it('listInventoryAuditLogs() omits target_type when not filtering (the "All activity" case)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1 } }));

    await listInventoryAuditLogs(client, { page: 1 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/inventory/audit-logs?page=1');
  });
});
