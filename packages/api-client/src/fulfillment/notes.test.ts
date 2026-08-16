import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { addShipmentNote } from './notes.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('fulfillment notes', () => {
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

  it('addShipmentNote() posts to the real endpoint with the exact snake_case AddShipmentNoteRequest fields', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'note1', authorId: 'u1', body: 'Called courier.', isCustomerVisible: false, createdAt: '2026-08-16T00:00:00Z' } }, 201));

    await addShipmentNote(client, 's1', { body: 'Called courier.', isCustomerVisible: true });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipments/s1/notes');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ body: 'Called courier.', is_customer_visible: true });
  });

  it('addShipmentNote() defaults is_customer_visible to false when not supplied', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'note1' } }, 201));

    await addShipmentNote(client, 's1', { body: 'Internal note.' });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init.body as string)).toEqual({ body: 'Internal note.', is_customer_visible: false });
  });
});
