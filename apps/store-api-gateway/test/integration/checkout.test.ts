import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTestApp, stubBackendFetch, testEnv } from './testUtils.js';

const PRODUCT_ID = '11111111-1111-1111-1111-111111111111';
const SESSION_ID = '22222222-2222-2222-2222-222222222222';
const ORDER_ID = '33333333-3333-3333-3333-333333333333';
const METHOD_ID = '44444444-4444-4444-4444-444444444444';

describe('routes/checkout (integration — Category B, real backend response shapes stubbed at the network boundary)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POST /v1/checkout/shipping-options composes a real Catalog weight with a real Shipping quote', async () => {
    stubBackendFetch([
      { match: `products/${PRODUCT_ID}`, status: 200, body: { data: { id: PRODUCT_ID, weightGrams: 500 } } },
      {
        match: 'shipping/quote-options',
        status: 200,
        body: { data: [{ shippingMethodId: METHOD_ID, label: 'Standard Delivery', shippingZoneId: 'zone-1', shippingRateId: 'rate-1', weightGrams: 500, amount: '60.0000', currencyCode: 'BDT' }] },
      },
    ]);
    const app = await buildTestApp(testEnv());
    const response = await app.inject({
      method: 'POST',
      url: '/v1/checkout/shipping-options',
      payload: { countryCode: 'BD', region: 'Dhaka', lines: [{ productId: PRODUCT_ID, quantity: 1 }] },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([{ id: METHOD_ID, label: 'Standard Delivery', amount: '60.0000', currencyCode: 'BDT' }]);
    await app.close();
  });

  it('POST /v1/checkout/shipping-options returns an honest empty list rather than a guessed weight when Catalog has none recorded', async () => {
    stubBackendFetch([{ match: `products/${PRODUCT_ID}`, status: 200, body: { data: { id: PRODUCT_ID, weightGrams: null } } }]);
    const app = await buildTestApp(testEnv());
    const response = await app.inject({
      method: 'POST',
      url: '/v1/checkout/shipping-options',
      payload: { countryCode: 'BD', lines: [{ productId: PRODUCT_ID, quantity: 1 }] },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([]);
    await app.close();
  });

  it('POST /v1/checkout/submit runs the real saga end to end and returns a real order + payment', async () => {
    stubBackendFetch([
      { match: `products/${PRODUCT_ID}`, status: 200, body: { data: { id: PRODUCT_ID, weightGrams: 500 } } },
      {
        match: 'shipping/quote-options',
        status: 200,
        body: { data: [{ shippingMethodId: METHOD_ID, label: 'Standard Delivery', shippingZoneId: 'zone-1', shippingRateId: 'rate-1', weightGrams: 500, amount: '60.0000', currencyCode: 'BDT' }] },
      },
      { match: 'items', status: 201, body: { data: {} } },
      { match: 'billing-address', status: 200, body: { data: { id: SESSION_ID, version: 3 } } },
      { match: 'shipping-address', status: 200, body: { data: { id: SESSION_ID, version: 4 } } },
      { match: 'shipping-option', status: 200, body: { data: { id: SESSION_ID, version: 5 } } },
      { match: 'review', status: 200, body: { data: { id: SESSION_ID, version: 6, status: 'reviewed' } } },
      { match: 'submit', status: 200, body: { data: { id: ORDER_ID, orderNumber: 'ORD-1', grandTotal: '2495.0000', items: [], addresses: [], discounts: [] } } },
      { match: 'payments', status: 201, body: { data: { id: 'pay-1', orderId: ORDER_ID, status: 'pending', gatewayCode: 'cod', instructions: 'Pay in cash when your order is delivered.' } } },
      { match: 'checkout/sessions', status: 201, body: { data: { id: SESSION_ID, version: 1 } } },
    ]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/checkout/submit',
      payload: {
        email: 'shopper@example.com',
        name: 'Test Shopper',
        currencyCode: 'BDT',
        address: { recipientName: 'Test Shopper', addressLine1: 'House 1', city: 'Dhaka', countryCode: 'BD' },
        shippingOptionId: METHOD_ID,
        paymentGatewayCode: 'cod',
        lines: [{ productId: PRODUCT_ID, quantity: 1 }],
        idempotencyKey: 'idem-1',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.order.id).toBe(ORDER_ID);
    expect(body.data.payment.status).toBe('pending');
    expect(body.data.paymentError).toBeNull();
    await app.close();
  });

  it('POST /v1/checkout/submit rejects an empty cart with a real, structured 422 - never calls the backend at all', async () => {
    stubBackendFetch([]);
    const app = await buildTestApp(testEnv());

    const response = await app.inject({
      method: 'POST',
      url: '/v1/checkout/submit',
      payload: {
        email: 'shopper@example.com',
        name: 'Test Shopper',
        currencyCode: 'BDT',
        address: { recipientName: 'Test Shopper', addressLine1: 'House 1', city: 'Dhaka', countryCode: 'BD' },
        shippingOptionId: 'standard',
        paymentGatewayCode: 'cod',
        lines: [],
        idempotencyKey: 'idem-1',
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('validation_failed');
    await app.close();
  });
});

describe('routes/orders (integration — real Guest Order Lookup, Gateway-side authorization)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the real order when both the order number and email match exactly', async () => {
    stubBackendFetch([
      { match: 'orders?', status: 200, body: { data: [{ id: ORDER_ID, orderNumber: 'ORD-1', customerEmail: 'shopper@example.com', items: [], addresses: [], discounts: [] }] } },
    ]);
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: '/v1/orders/lookup?orderNumber=ORD-1&email=shopper@example.com' });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.id).toBe(ORDER_ID);
    await app.close();
  });

  it('returns a real, generic 404 when the email does not match the real order - never confirms the order number alone is valid', async () => {
    stubBackendFetch([
      { match: 'orders?', status: 200, body: { data: [{ id: ORDER_ID, orderNumber: 'ORD-1', customerEmail: 'real-owner@example.com', items: [], addresses: [], discounts: [] }] } },
    ]);
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: '/v1/orders/lookup?orderNumber=ORD-1&email=attacker@example.com' });

    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it('returns a real 404 when no order matches at all', async () => {
    stubBackendFetch([{ match: 'orders?', status: 200, body: { data: [] } }]);
    const app = await buildTestApp(testEnv());
    const response = await app.inject({ method: 'GET', url: '/v1/orders/lookup?orderNumber=ORD-DOES-NOT-EXIST&email=shopper@example.com' });

    expect(response.statusCode).toBe(404);
    await app.close();
  });
});
