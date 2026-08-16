import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../client.js';
import { setShipmentDestination } from './destination.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('fulfillment destination', () => {
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

  it('setShipmentDestination() maps camelCase input to the exact snake_case SetShipmentDestinationRequest fields', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 's1', status: 'pending' } }));

    await setShipmentDestination(client, 's1', {
      recipientName: 'Farhana Akter',
      phone: '+8801700000000',
      addressLine1: 'House 12, Road 5',
      city: 'Dhaka',
      region: 'Dhaka',
      postalCode: '1212',
      countryCode: 'BD',
      weightGrams: 650,
      expectedVersion: 1,
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/shipments/s1/destination');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({
      destination_recipient_name: 'Farhana Akter',
      destination_phone: '+8801700000000',
      destination_address_line1: 'House 12, Road 5',
      destination_city: 'Dhaka',
      destination_region: 'Dhaka',
      destination_postal_code: '1212',
      destination_country_code: 'BD',
      weight_grams: 650,
      expected_version: 1,
    });
  });

  it('setShipmentDestination() omits optional fields entirely when not supplied', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 's1', status: 'pending' } }));

    await setShipmentDestination(client, 's1', {
      recipientName: 'Farhana Akter',
      phone: '+8801700000000',
      addressLine1: 'House 12, Road 5',
      city: 'Dhaka',
      countryCode: 'BD',
      expectedVersion: 1,
    });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect('destination_address_line2' in body).toBe(false);
    expect('destination_region' in body).toBe(false);
    expect('destination_postal_code' in body).toBe(false);
    expect('weight_grams' in body).toBe(false);
  });
});
