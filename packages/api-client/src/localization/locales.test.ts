import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listLocales, getLocale, createLocale, updateLocale, archiveLocale, deleteLocale } from './locales.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('localization locales', () => {
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

  it('listLocales() maps status to the real query param', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));
    await listLocales(client, { status: 'active' });
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/locales?status=active');
  });

  it('createLocale() never sends is_default — CreateLocaleRequest does not accept it', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'l1' } }, 201));
    await createLocale(client, { code: 'fr', name: 'French', nativeName: 'Français' });
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ code: 'fr', name: 'French', native_name: 'Français', is_rtl: undefined });
    expect('is_default' in body).toBe(false);
  });

  it('updateLocale() sends is_default when supplied — the real "promote to default" path', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'l1' } }));
    await updateLocale(client, 'l1', { isDefault: true, expectedVersion: 3 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/locales/l1');
    expect(JSON.parse(init.body as string)).toEqual({ is_default: true, expected_version: 3 });
  });

  it('archiveLocale()/deleteLocale() hit the real endpoints with expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'l1', status: 'archived' } }));
    await archiveLocale(client, 'l1', { expectedVersion: 1 });
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/locales/l1/archive');

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteLocale(client, 'l1', { expectedVersion: 1 });
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe('https://api.test/locales/l1');
    expect(init.method).toBe('DELETE');
  });

  it('getLocale() hits the real show endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'l1' } }));
    await getLocale(client, 'l1');
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/locales/l1');
  });
});
