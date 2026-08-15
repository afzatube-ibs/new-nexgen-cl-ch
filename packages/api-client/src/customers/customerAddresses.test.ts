import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { addCustomerAddress, updateCustomerAddress, deleteCustomerAddress } from './customerAddresses.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('customerAddresses', () => {
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

  const addressDto = {
    id: 'a1',
    label: 'Home',
    recipientName: 'Jane Shopper',
    phone: null,
    addressLine1: '1 Market Street',
    addressLine2: null,
    city: 'San Francisco',
    region: 'CA',
    postalCode: '94105',
    countryCode: 'US',
    isDefaultShipping: false,
    isDefaultBilling: false,
    createdAt: '2026-08-15T00:00:00Z',
    updatedAt: '2026-08-15T00:00:00Z',
  };

  it('addCustomerAddress() posts to the nested endpoint with the customer\'s own expected_version, snake_case body', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: addressDto }, 201));

    await addCustomerAddress(client, 'c1', {
      recipientName: 'Jane Shopper',
      addressLine1: '1 Market Street',
      city: 'San Francisco',
      countryCode: 'US',
      expectedVersion: 1,
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/customers/c1/addresses');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      recipient_name: 'Jane Shopper',
      address_line1: '1 Market Street',
      city: 'San Francisco',
      country_code: 'US',
      expected_version: 1,
    });
  });

  it('updateCustomerAddress() patches the nested endpoint, sends only what changed', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ...addressDto, city: 'Shelbyville' } }));

    await updateCustomerAddress(client, 'c1', 'a1', { city: 'Shelbyville', expectedVersion: 1 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/customers/c1/addresses/a1');
    expect(init.method).toBe('PATCH');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.city).toBe('Shelbyville');
    expect(body.expected_version).toBe(1);
  });

  it('deleteCustomerAddress() deletes with the customer\'s own expected_version', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await deleteCustomerAddress(client, 'c1', 'a1', 1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/customers/c1/addresses/a1');
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({ expected_version: 1 });
  });
});
