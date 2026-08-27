// @vitest-environment jsdom
// `checkoutClient.ts`'s own `isConfigured()` guards on `typeof window !==
// 'undefined'` (same real SSR-safety pattern `trackEvent.ts` established
// — this module must never run during a Next.js server render). This
// suite's config default environment is `node`, where `window` does not
// exist at all — jsdom, opted in here per-file like `AddToCartButton.
// test.tsx`, is what makes that real guard's "configured" branch
// reachable in a test at all.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchShippingOptions, submitCheckout, lookupOrder, CheckoutRequestError, type SubmitCheckoutRequestBody } from '../src/checkout/checkoutClient.js';

/**
 * Beta Sprint 5 — same `vi.stubGlobal('fetch', ...)` network-boundary
 * approach `gatewayClient.test.ts` already established for the server-only
 * client, applied here to this genuinely client-only one.
 * `NEXT_PUBLIC_STORE_API_GATEWAY_URL` is set globally for every test file
 * in `vitest.config.ts` — see that file's own docblock for why.
 */
function stubFetch(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }))),
  );
}

function validBody(overrides: Partial<SubmitCheckoutRequestBody> = {}): SubmitCheckoutRequestBody {
  return {
    email: 'shopper@example.com',
    name: 'Test Shopper',
    currencyCode: 'BDT',
    address: { recipientName: 'Test Shopper', addressLine1: 'House 1', city: 'Dhaka', countryCode: 'BD' },
    shippingOptionId: 'standard',
    paymentGatewayCode: 'cod',
    lines: [{ productId: 'p1', quantity: 1 }],
    idempotencyKey: 'idem-1',
    ...overrides,
  };
}

describe('checkout/checkoutClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetchShippingOptions unwraps the real Gateway envelope', async () => {
    stubFetch(200, { data: [{ id: 'standard', label: 'Standard Shipping', amount: '5.0000' }], meta: { requestId: 'r1' } });
    const options = await fetchShippingOptions();
    expect(options).toEqual([{ id: 'standard', label: 'Standard Shipping', amount: '5.0000' }]);
  });

  it('submitCheckout POSTs the real request body and returns the real order + payment', async () => {
    stubFetch(200, { data: { order: { id: 'o1', orderNumber: 'ORD-1' }, payment: { id: 'pay-1', status: 'pending' }, paymentError: null }, meta: { requestId: 'r1' } });
    const result = await submitCheckout(validBody());
    expect(result.order.id).toBe('o1');
    expect(result.payment?.status).toBe('pending');

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:4000/v1/checkout/submit');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({ email: 'shopper@example.com', paymentGatewayCode: 'cod' });
  });

  it('submitCheckout throws a structured CheckoutRequestError with field details on a real 422', async () => {
    stubFetch(422, { error: { code: 'validation_failed', message: 'One or more fields failed validation.', details: [{ field: 'address.city', message: 'City is required.' }] }, meta: { requestId: 'r1' } });
    await expect(submitCheckout(validBody())).rejects.toThrow(CheckoutRequestError);
    try {
      await submitCheckout(validBody());
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(CheckoutRequestError);
      expect((error as CheckoutRequestError).details).toEqual([{ field: 'address.city', message: 'City is required.' }]);
    }
  });

  it('lookupOrder throws a CheckoutRequestError with isNotFound=true on a real 404', async () => {
    stubFetch(404, { error: { code: 'not_found', message: "We couldn't find an order matching that order number and email." }, meta: { requestId: 'r1' } });
    try {
      await lookupOrder('ORD-1', 'shopper@example.com');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(CheckoutRequestError);
      expect((error as CheckoutRequestError).isNotFound).toBe(true);
    }
  });

  it('lookupOrder sends the order number and email as real query params', async () => {
    stubFetch(200, { data: { id: 'o1', orderNumber: 'ORD-1' }, meta: { requestId: 'r1' } });
    await lookupOrder('ORD-1', 'shopper@example.com');
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain('orderNumber=ORD-1');
    expect(url).toContain('email=shopper%40example.com');
  });

  it('reports a real, specific error — never a silent no-op — when the Gateway URL is not configured', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_STORE_API_GATEWAY_URL', '');
    const mod = await import('../src/checkout/checkoutClient.js');
    await expect(mod.fetchShippingOptions()).rejects.toThrow(mod.CheckoutRequestError);
  });
});
