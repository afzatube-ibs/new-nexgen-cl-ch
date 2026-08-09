import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { createResourceClient } from './resourceClient.js';

interface Widget {
  id: string;
  name: string;
  version: number;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('createResourceClient', () => {
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

  it('list() GETs the base path with the given query', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));
    await createResourceClient<Widget>(client, '/widgets').list({ status: 'active' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/widgets?status=active');
    expect(init.method).toBe('GET');
  });

  it('create() POSTs the body and unwraps `data`', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: '1', name: 'Widget', version: 1 } }));
    const result = await createResourceClient<Widget>(client, '/widgets').create({ name: 'Widget' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/widgets');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Widget' });
    expect(result).toEqual({ id: '1', name: 'Widget', version: 1 });
  });

  it('update() PATCHes /{basePath}/{id}', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: '1', name: 'Renamed', version: 2 } }));
    await createResourceClient<Widget>(client, '/widgets').update('1', { name: 'Renamed', expected_version: 1 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/widgets/1');
    expect(init.method).toBe('PATCH');
  });

  it('archive() POSTs /{id}/archive with `expected_version`', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: '1', name: 'Widget', version: 2 } }));
    await createResourceClient<Widget>(client, '/widgets').archive('1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/widgets/1/archive');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 1 });
  });

  it('destroy() sends `expected_version` on the DELETE body', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await createResourceClient<Widget>(client, '/widgets').destroy('1', 3);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/widgets/1');
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 3 });
  });

  it('restore() POSTs /{id}/restore with no body', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: '1', name: 'Widget', version: 4 } }));
    await createResourceClient<Widget>(client, '/widgets').restore('1');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/widgets/1/restore');
    expect(init.method).toBe('POST');
  });
});
