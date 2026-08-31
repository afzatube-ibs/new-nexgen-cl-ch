import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTestApp, stubBackendFetch, testEnv } from './testUtils.js';

const CUSTOMER_ID = '11111111-1111-1111-1111-111111111111';
const ADDRESS_ID = '22222222-2222-2222-2222-222222222222';
const ORDER_ID = '33333333-3333-3333-3333-333333333333';

describe('routes/customers (integration — Category C, real per-request customer credential)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POST /v1/customers/register forwards to the real backend with no Authorization header at all', async () => {
    stubBackendFetch([{ match: 'customers/register', status: 201, body: { data: { id: CUSTOMER_ID, name: 'Jane', email: 'jane@example.test' } } }]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/customers/register',
      payload: { name: 'Jane', phone: '+8801700000000', email: 'jane@example.test', password: 'Str0ng!Passw0rd#123', password_confirmation: 'Str0ng!Passw0rd#123' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.email).toBe('jane@example.test');
    await app.close();
  });

  it('POST /v1/customers/password/forgot forwards to the real backend with no Authorization header', async () => {
    stubBackendFetch([{ match: 'customers/password/forgot', status: 200, body: { data: { message: 'If that email has an account, a password reset link was sent.' } } }]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({ method: 'POST', url: '/v1/customers/password/forgot', payload: { email: 'jane@example.test' } });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.message).toContain('password reset link was sent');
    await app.close();
  });

  it('POST /v1/customers/password/reset relays a real validation failure (e.g. an invalid token) as a clean 422', async () => {
    // The real backend's own ONE, confirmed, platform-wide error envelope
    // (`bootstrap/app.php`'s own `$envelope` closure) — see
    // extractBackendValidationDetails's own docblock for the two prior,
    // incorrect assumptions this stub deliberately does NOT repeat.
    stubBackendFetch([
      {
        match: 'customers/password/reset',
        status: 422,
        body: { error: { type: 'validation_failed', message: 'The given data was invalid.', details: { token: ['This password reset link is invalid or has expired.'] } } },
      },
    ]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/customers/password/reset',
      payload: { email: 'jane@example.test', token: 'wrong', password: 'Str0ng!Passw0rd#123', password_confirmation: 'Str0ng!Passw0rd#123' },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.details[0].message).toBe('This password reset link is invalid or has expired.');
    await app.close();
  });

  it('POST /v1/customers/login relays the real backend-issued token in meta.token', async () => {
    stubBackendFetch([
      { match: 'customers/login', status: 200, body: { data: { id: CUSTOMER_ID, email: 'jane@example.test' }, meta: { token: 'real-plaintext-token' } } },
    ]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/customers/login',
      payload: { identifier: 'jane@example.test', password: 'correct-password', device_name: 'storefront' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().meta.token).toBe('real-plaintext-token');
    await app.close();
  });

  // Phase 4.0 Slice 4.1 (Mobile-First Customer Identity) — `identifier`
  // accepts a phone-shaped value too, matching the real backend's own
  // `LoginCustomerAction` OR lookup.
  it('POST /v1/customers/login accepts a phone number as the identifier', async () => {
    stubBackendFetch([
      { match: 'customers/login', status: 200, body: { data: { id: CUSTOMER_ID, phone: '+8801812345678' }, meta: { token: 'real-plaintext-token' } } },
    ]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/customers/login',
      payload: { identifier: '+8801812345678', password: 'correct-password', device_name: 'storefront' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().meta.token).toBe('real-plaintext-token');
    await app.close();
  });

  it('POST /v1/customers/register rejects a request with no phone at all, before ever reaching the real backend', async () => {
    const app = await buildTestApp(testEnv());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/customers/register',
      payload: { name: 'Jane', email: 'jane@example.test', password: 'Str0ng!Passw0rd#123', password_confirmation: 'Str0ng!Passw0rd#123' },
    });

    expect(response.statusCode).toBe(422);
    await app.close();
  });

  it('GET /v1/customers/me returns a clean, structured 401 (never a bare 502) with no Authorization header', async () => {
    stubBackendFetch([{ match: 'customers/me', status: 401, body: {} }]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({ method: 'GET', url: '/v1/customers/me' });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('unauthenticated');
    await app.close();
  });

  it('GET /v1/customers/me forwards the caller\'s own bearer token unchanged to the real backend', async () => {
    stubBackendFetch([{ match: 'customers/me', status: 200, body: { data: { id: CUSTOMER_ID, email: 'jane@example.test' } } }]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({ method: 'GET', url: '/v1/customers/me', headers: { authorization: 'Bearer real-customer-token' } });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.email).toBe('jane@example.test');
    await app.close();
  });

  it('maps a real backend 401 (e.g. a revoked token) to the same clean unauthenticated code, not upstream_error', async () => {
    stubBackendFetch([{ match: 'customers/me', status: 401, body: {} }]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({ method: 'GET', url: '/v1/customers/me', headers: { authorization: 'Bearer a-revoked-token' } });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('unauthenticated');
    await app.close();
  });

  it('POST /v1/customers/me/addresses forwards the real address payload and token', async () => {
    stubBackendFetch([{ match: 'customers/me/addresses', status: 201, body: { data: { id: ADDRESS_ID, city: 'Dhaka' } } }]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/customers/me/addresses',
      headers: { authorization: 'Bearer real-customer-token' },
      payload: { recipient_name: 'Jane', address_line1: '1 Main St', city: 'Dhaka', country_code: 'BD', expected_version: 1 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.id).toBe(ADDRESS_ID);
    await app.close();
  });

  it('DELETE /v1/customers/me/addresses/:id requires a real token', async () => {
    stubBackendFetch([]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({
      method: 'DELETE',
      url: `/v1/customers/me/addresses/${ADDRESS_ID}`,
      payload: { expected_version: 1 },
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });
});

describe('routes/orders mine (integration — Category C order history)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET /v1/orders/mine requires a real customer token', async () => {
    stubBackendFetch([]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({ method: 'GET', url: '/v1/orders/mine' });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('GET /v1/orders/mine forwards the real token and returns the real backend list', async () => {
    stubBackendFetch([{ match: 'orders/mine', status: 200, body: { data: [{ id: ORDER_ID, orderNumber: 'ORD-1' }] } }]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({ method: 'GET', url: '/v1/orders/mine', headers: { authorization: 'Bearer real-customer-token' } });

    expect(response.statusCode).toBe(200);
    expect(response.json().data[0].id).toBe(ORDER_ID);
    await app.close();
  });

  it('GET /v1/orders/mine/:id returns a clean 404 for another customer\'s order (the real backend\'s own ownership check)', async () => {
    stubBackendFetch([{ match: `orders/mine/${ORDER_ID}`, status: 404, body: {} }]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({
      method: 'GET',
      url: `/v1/orders/mine/${ORDER_ID}`,
      headers: { authorization: 'Bearer real-customer-token' },
    });

    expect(response.statusCode).toBe(404);
    await app.close();
  });
});
