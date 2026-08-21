import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTestApp, stubBackendFetch, testEnv } from '../integration/testUtils.js';

describe('Security (§3 of STORE_API_GATEWAY_ARCHITECTURE.md)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects requests past the configured rate limit with a structured 429, never a bare connection drop', async () => {
    stubBackendFetch([{ match: '/brands', status: 200, body: { data: [] } }]);
    const app = await buildTestApp(testEnv({ RATE_LIMIT_MAX: '3' }));

    const responses = [];
    for (let i = 0; i < 5; i += 1) {
      responses.push(await app.inject({ method: 'GET', url: '/v1/brands' }));
    }

    const limited = responses.filter((r) => r.statusCode === 429);
    expect(limited.length).toBeGreaterThan(0);
    expect(limited[0]?.json().error.code).toBe('rate_limited');

    await app.close();
  });

  it('applies security headers (helmet) to every response', async () => {
    stubBackendFetch([{ match: '/brands', status: 200, body: { data: [] } }]);
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: '/v1/brands' });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    await app.close();
  });

  it('never leaks a raw stack trace on an unhandled error — always the structured GatewayErrorBody', async () => {
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: '/v1/products/malformed-not-a-uuid' });
    const body = response.json();
    expect(body).toHaveProperty('error.code');
    expect(body).toHaveProperty('meta.requestId');
    expect(JSON.stringify(body)).not.toMatch(/at .*\(.*:\d+:\d+\)/); // no stack-trace-shaped content
    await app.close();
  });

  it('returns a structured 404 (never a bare Fastify default page) for an unknown route', async () => {
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: '/v1/does-not-exist' });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('not_found');
    await app.close();
  });

  it('rejects an unsupported CORS origin (only explicitly configured origins are allowed)', async () => {
    stubBackendFetch([{ match: '/brands', status: 200, body: { data: [] } }]);
    const app = await buildTestApp(testEnv({ CORS_ALLOWED_ORIGINS: 'https://trusted-storefront.example.com' }));
    const response = await app.inject({
      method: 'GET',
      url: '/v1/brands',
      headers: { origin: 'https://evil.example.com' },
    });
    expect(response.headers['access-control-allow-origin']).not.toBe('https://evil.example.com');
    await app.close();
  });

  it('the guest session cookie is HttpOnly (never readable by Theme Package client-side code)', async () => {
    stubBackendFetch([{ match: '/brands', status: 200, body: { data: [] } }]);
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: '/v1/brands' });
    expect(String(response.headers['set-cookie'])).toMatch(/HttpOnly/i);
    await app.close();
  });
});
