import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { addReturnNote } from './notes.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('returns notes', () => {
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

  it('addReturnNote() defaults isCustomerVisible to false, matching the real backend default', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'n1', body: 'Called customer', isCustomerVisible: false } }, 201));
    await addReturnNote(client, 'r1', { body: 'Called customer' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/return-requests/r1/notes');
    expect(JSON.parse(init.body as string)).toEqual({ body: 'Called customer', is_customer_visible: false });
  });

  it('addReturnNote() sends isCustomerVisible: true when set', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'n1' } }, 201));
    await addReturnNote(client, 'r1', { body: 'Refund processed', isCustomerVisible: true });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init.body as string)).toEqual({ body: 'Refund processed', is_customer_visible: true });
  });
});
