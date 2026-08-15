import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listNotifications } from './notifications.js';
import { ORDER_RELATED_TYPE } from './types.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('notifications', () => {
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

  it('listNotifications() hits the real endpoint with the real related_type/related_id pair — genuinely server-side', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } }));

    await listNotifications(client, { relatedType: ORDER_RELATED_TYPE, relatedId: 'o1' });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/notifications?related_type=order&related_id=o1');
  });

  it('listNotifications() maps status through to the real query param', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    await listNotifications(client, { status: 'sent' });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/notifications?status=sent');
  });
});
