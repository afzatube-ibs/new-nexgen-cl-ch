import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listNotificationTemplates, getNotificationTemplate, createNotificationTemplate, updateNotificationTemplate } from './templates.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('notification templates', () => {
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

  it('listNotificationTemplates() sends channel/code/q as real query params', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));
    await listNotificationTemplates(client, { channel: 'email', q: 'receipt' });
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/notification-templates?channel=email&q=receipt');
  });

  it('getNotificationTemplate() hits the real single-item endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 't1' } }));
    await getNotificationTemplate(client, 't1');
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/notification-templates/t1');
  });

  it('createNotificationTemplate() sends the real create payload', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 't1' } }, 201));
    await createNotificationTemplate(client, { code: 'order.confirmed', channel: 'email', body: 'Hello {{name}}' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/notification-templates');
    expect(JSON.parse(init.body as string)).toEqual({ code: 'order.confirmed', channel: 'email', body: 'Hello {{name}}' });
  });

  it('updateNotificationTemplate() never sends code/channel/locale — not editable after creation', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 't1' } }));
    await updateNotificationTemplate(client, 't1', { subject: 'New subject', expectedVersion: 3 });
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ subject: 'New subject', expected_version: 3 });
    expect(body).not.toHaveProperty('code');
    expect(body).not.toHaveProperty('channel');
  });
});
