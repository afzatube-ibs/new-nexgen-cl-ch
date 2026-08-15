import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from './client.js';
import { listUsers } from './users.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('listUsers', () => {
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

  it('hits the real staff directory endpoint with a bounded per_page, unwraps the envelope', async () => {
    const user = { id: 'u1', name: 'Jordan Rivera', email: 'jordan@example.com', status: 'active', roles: [], version: 1, createdAt: null, updatedAt: null };
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [user] }));

    const result = await listUsers(client);

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/users?per_page=100');
    expect(result).toEqual([user]);
  });
});
