import { describe, expect, it, vi } from 'vitest';
import { orchestrateGuestCheckout } from '../../../src/checkout/orchestrator.js';
import { GatewayError } from '../../../src/lib/errors.js';
import type { CheckoutBackendClient } from '../../../src/backend/checkoutClient.js';
import type { SubmitCheckoutRequestBody } from '../../../src/checkout/types.js';

const PRODUCT_ID = '11111111-1111-1111-1111-111111111111';
const SESSION_ID = '22222222-2222-2222-2222-222222222222';
const ORDER_ID = '33333333-3333-3333-3333-333333333333';

function validBody(overrides: Partial<SubmitCheckoutRequestBody> = {}): SubmitCheckoutRequestBody {
  return {
    email: 'shopper@example.com',
    name: 'Test Shopper',
    currencyCode: 'BDT',
    address: {
      recipientName: 'Test Shopper',
      phone: '01711111111',
      addressLine1: 'House 1, Road 2',
      city: 'Dhaka',
      region: 'Dhaka',
      postalCode: '1212',
      countryCode: 'BD',
    },
    shippingOptionId: 'standard',
    paymentGatewayCode: 'cod',
    lines: [{ productId: PRODUCT_ID, quantity: 1 }],
    idempotencyKey: 'idem-1',
    ...overrides,
  };
}

/** A real session snapshot shape, version incrementing exactly like the real backend's own optimistic lock. */
function session(version: number, extra: Record<string, unknown> = {}) {
  return { id: SESSION_ID, currencyCode: 'BDT', status: 'open', version, ...extra };
}

function makeMockBackend(): CheckoutBackendClient {
  const post = vi
    .fn()
    // 1. start
    .mockResolvedValueOnce({ data: session(1) })
    // 2. add item
    .mockResolvedValueOnce({ data: {} })
    // 6. review — ReviewCheckoutAction's own save() increments lock_version like every other CheckoutSession update.
    .mockResolvedValueOnce({ data: session(6, { status: 'reviewed', subtotal: '2490.0000', grandTotal: '2495.0000' }) })
    // 7. submit
    .mockResolvedValueOnce({ data: { id: ORDER_ID, orderNumber: 'ORD-1', grandTotal: '2495.0000', items: [], addresses: [], discounts: [] } })
    // 8. initiate payment
    .mockResolvedValueOnce({ data: { id: 'pay-1', orderId: ORDER_ID, status: 'pending', gatewayCode: 'cod', instructions: 'Pay in cash when your order is delivered.' } });

  const put = vi
    .fn()
    // 3. billing address
    .mockResolvedValueOnce({ data: session(3) })
    // 4. shipping address
    .mockResolvedValueOnce({ data: session(4) })
    // 5. shipping option
    .mockResolvedValueOnce({ data: session(5, { shippingOptionId: 'standard', shippingTotal: '5.0000' }) });

  return { post, put, get: vi.fn() } as unknown as CheckoutBackendClient;
}

describe('checkout/orchestrator', () => {
  it('runs the real 8-step saga in order and returns a real order and payment', async () => {
    const backend = makeMockBackend();
    const result = await orchestrateGuestCheckout(validBody(), { backend, correlationId: 'corr-1' });

    expect(result.order.id).toBe(ORDER_ID);
    expect(result.payment?.status).toBe('pending');
    expect(result.paymentError).toBeNull();

    // Real sequencing, real endpoints, real version threading.
    const postCalls = (backend.post as ReturnType<typeof vi.fn>).mock.calls;
    expect(postCalls[0]?.[0]).toMatchObject({ path: 'checkout/sessions', body: { guest_email: 'shopper@example.com', guest_name: 'Test Shopper', currency_code: 'BDT' } });
    expect(postCalls[1]?.[0]).toMatchObject({ path: `checkout/sessions/${SESSION_ID}/items`, body: { product_id: PRODUCT_ID, quantity: 1, expected_version: 1 } });
    expect(postCalls[2]?.[0]).toMatchObject({ path: `checkout/sessions/${SESSION_ID}/review`, body: { expected_version: 5 } });
    expect(postCalls[3]?.[0]).toMatchObject({ path: `checkout/sessions/${SESSION_ID}/submit`, body: { idempotency_key: 'idem-1', expected_version: 6 } });
    expect(postCalls[4]?.[0]).toMatchObject({ path: 'payments', body: { order_id: ORDER_ID, gateway_code: 'cod' } });

    const putCalls = (backend.put as ReturnType<typeof vi.fn>).mock.calls;
    expect(putCalls[0]?.[0]).toMatchObject({ path: `checkout/sessions/${SESSION_ID}/billing-address`, body: { recipient_name: 'Test Shopper', expected_version: 2 } });
    expect(putCalls[2]?.[0]).toMatchObject({ path: `checkout/sessions/${SESSION_ID}/shipping-option`, body: { shipping_option_id: 'standard', expected_version: 4 } });
  });

  it('never invents a product_id/sku/price for an item — sends only product_id, quantity, and expected_version', async () => {
    const backend = makeMockBackend();
    await orchestrateGuestCheckout(validBody(), { backend, correlationId: 'corr-2' });
    const itemCall = (backend.post as ReturnType<typeof vi.fn>).mock.calls[1]?.[0] as { body: Record<string, unknown> };
    expect(Object.keys(itemCall.body).sort()).toEqual(['expected_version', 'product_id', 'quantity']);
  });

  it('returns a real order with payment: null and a real paymentError when payment initiation fails - never rolls back the real order', async () => {
    const backend = makeMockBackend();
    (backend.post as ReturnType<typeof vi.fn>).mockReset();
    (backend.post as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: session(1) })
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({ data: session(5, { status: 'reviewed' }) })
      .mockResolvedValueOnce({ data: { id: ORDER_ID, orderNumber: 'ORD-1', grandTotal: '2495.0000', items: [], addresses: [], discounts: [] } })
      .mockRejectedValueOnce(new Error('Backend payments responded 422'));

    const result = await orchestrateGuestCheckout(validBody({ paymentGatewayCode: 'bkash' }), { backend, correlationId: 'corr-3' });

    expect(result.order.id).toBe(ORDER_ID);
    expect(result.payment).toBeNull();
    expect(result.paymentError).toContain('422');
  });

  it('rejects an empty cart before calling the backend at all', async () => {
    const backend = makeMockBackend();
    await expect(orchestrateGuestCheckout(validBody({ lines: [] }), { backend, correlationId: 'corr-4' })).rejects.toThrow(GatewayError);
    expect(backend.post).not.toHaveBeenCalled();
  });

  it('rejects a missing recipient name before calling the backend at all', async () => {
    const backend = makeMockBackend();
    await expect(
      orchestrateGuestCheckout(validBody({ address: { ...validBody().address, recipientName: '' } }), { backend, correlationId: 'corr-5' }),
    ).rejects.toThrow(GatewayError);
    expect(backend.post).not.toHaveBeenCalled();
  });
});
