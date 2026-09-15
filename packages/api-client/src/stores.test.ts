import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from './client.js';
import { createStore } from './stores.js';

describe('stores', () => {
  const fetchMock = vi.fn();

  beforeEach(() => vi.stubGlobal('fetch', fetchMock));
  afterEach(() => vi.unstubAllGlobals());

  it('creates the first store using the backend request field names', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'store-1', name: 'Lokkisona' } }), { status: 201 }));
    const client = new ApiClient({ baseUrl: 'https://api.test', getToken: () => null });

    await createStore(client, {
      name: 'Lokkisona', currencyCode: 'BDT', locale: 'en', timezone: 'Asia/Dhaka',
      contactEmail: 'shop@example.com', contactPhone: '01700000000', addressLine1: 'Dhaka', city: 'Dhaka', countryCode: 'BD',
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/stores');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({
      name: 'Lokkisona', currency_code: 'BDT', locale: 'en', timezone: 'Asia/Dhaka',
      contact_email: 'shop@example.com', contact_phone: '01700000000', address_line1: 'Dhaka', city: 'Dhaka', country_code: 'BD',
    });
  });
});
