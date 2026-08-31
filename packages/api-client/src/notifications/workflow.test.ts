import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { getNotification, retryNotification, cancelNotification } from './workflow.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('notifications workflow', () => {
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

  it('getNotification() hits the real single-item endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'n1' } }));
    await getNotification(client, 'n1');
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/notifications/n1');
  });

  it('retryNotification() posts with no body at all — no expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'n1', status: 'queued' } }));
    await retryNotification(client, 'n1');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/notifications/n1/retry');
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
  });

  it('cancelNotification() sends expected_version in the real request body', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'n1', status: 'cancelled' } }));
    await cancelNotification(client, 'n1', { expectedVersion: 2 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/notifications/n1/cancel');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 2 });
  });
});
