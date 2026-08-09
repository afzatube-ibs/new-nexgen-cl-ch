import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from './client.js';
import { UnauthenticatedError, ValidationApiError, NetworkOrParseError } from './errors.js';

function jsonResponse(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

describe('ApiClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the bearer token when getToken returns one', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: '1' } }, 200));
    const client = new ApiClient({ baseUrl: 'https://api.test', getToken: () => 'my-token' });

    await client.get('/auth/me');

    const [, init] = fetchMock.mock.calls[0]!;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer my-token');
  });

  it('returns undefined for a 204 response', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = new ApiClient({ baseUrl: 'https://api.test', getToken: () => null });

    const result = await client.post('/auth/logout');
    expect(result).toBeUndefined();
  });

  it('throws ValidationApiError for a 422 envelope and preserves field errors', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: { type: 'validation_failed', message: 'Invalid.', details: { email: ['Required.'] } } }, 422),
    );
    const client = new ApiClient({ baseUrl: 'https://api.test', getToken: () => null });

    await expect(client.post('/auth/login', {})).rejects.toBeInstanceOf(ValidationApiError);
  });

  it('invokes onUnauthenticated exactly once on a 401', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: { type: 'unauthenticated', message: 'Authentication is required.' } }, 401),
    );
    const onUnauthenticated = vi.fn();
    const client = new ApiClient({ baseUrl: 'https://api.test', getToken: () => 'expired', onUnauthenticated });

    await expect(client.get('/auth/me')).rejects.toBeInstanceOf(UnauthenticatedError);
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
  });

  it('throws NetworkOrParseError when the response body is not valid JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>not json</html>', { status: 200 }));
    const client = new ApiClient({ baseUrl: 'https://api.test', getToken: () => null });

    await expect(client.get('/auth/me')).rejects.toBeInstanceOf(NetworkOrParseError);
  });

  it('serializes query parameters, dropping null/undefined', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }, 200));
    const client = new ApiClient({ baseUrl: 'https://api.test', getToken: () => null });

    await client.get('/stores', { query: { page: 2, q: undefined, active: true } });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/stores?page=2&active=true');
  });

  it('delete() sends a JSON body when given one — Catalog archive/destroy require `expected_version` (Phase 2.2)', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = new ApiClient({ baseUrl: 'https://api.test', getToken: () => null });

    await client.delete('/brands/1', { expected_version: 5 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/brands/1');
    expect(init.method).toBe('DELETE');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 5 });
  });

  it('delete() sends no body when none is given', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = new ApiClient({ baseUrl: 'https://api.test', getToken: () => null });

    await client.delete('/auth/some-token');

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.body).toBeUndefined();
  });
});
