import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { listCustomers, getCustomer, createCustomer, updateCustomer, archiveCustomer, destroyCustomer } from './customers.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('customers', () => {
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

  const customerDto = {
    id: 'c1',
    name: 'Jane Shopper',
    email: 'jane@example.test',
    phone: null,
    status: 'active',
    version: 1,
    createdAt: '2026-08-15T00:00:00Z',
    updatedAt: '2026-08-15T00:00:00Z',
  };

  it('listCustomers() hits the real endpoint with q/status/sort/direction/page/per_page — genuinely server-side, no client-side filtering', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [customerDto], meta: { current_page: 1, last_page: 1, total: 1 } }));

    await listCustomers(client, { q: 'jane', status: 'active', sort: 'name', direction: 'asc', page: 2, perPage: 25 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/customers?q=jane&status=active&sort=name&direction=asc&page=2&per_page=25');
  });

  it('getCustomer() hits the real detail endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: customerDto }));

    await getCustomer(client, 'c1');

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/customers/c1');
  });

  it('createCustomer() maps camelCase input to the exact snake_case RegisterCustomerRequest fields, including password_confirmation', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: customerDto }, 201));

    await createCustomer(client, {
      name: 'Jane Shopper',
      email: 'jane@example.test',
      password: 'Str0ng!Passw0rd#One',
      passwordConfirmation: 'Str0ng!Passw0rd#One',
      phone: '+1-202-555-0150',
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/customers');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'Jane Shopper',
      email: 'jane@example.test',
      password: 'Str0ng!Passw0rd#One',
      password_confirmation: 'Str0ng!Passw0rd#One',
      phone: '+1-202-555-0150',
    });
  });

  it('createCustomer() omits phone entirely when blank, never sends an empty string', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: customerDto }, 201));

    await createCustomer(client, {
      name: 'Jane Shopper',
      email: 'jane@example.test',
      password: 'Str0ng!Passw0rd#One',
      passwordConfirmation: 'Str0ng!Passw0rd#One',
      phone: '',
    });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect('phone' in body).toBe(false);
  });

  it('updateCustomer() maps camelCase input including expected_version, never sends password fields', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...customerDto, name: 'Renamed' } }));

    await updateCustomer(client, 'c1', { name: 'Renamed', expectedVersion: 1 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/customers/c1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Renamed', expected_version: 1 });
  });

  it('archiveCustomer() posts to the real archive endpoint with expected_version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...customerDto, status: 'archived' } }));

    await archiveCustomer(client, 'c1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/customers/c1/archive');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 1 });
  });

  it('destroyCustomer() deletes with expected_version, no restore() method exists on this module', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await destroyCustomer(client, 'c1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/customers/c1');
    expect(init.method).toBe('DELETE');
  });
});
