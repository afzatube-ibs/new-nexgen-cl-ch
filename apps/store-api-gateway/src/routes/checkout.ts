/**
 * Beta Sprint 5 — the Storefront's own real Guest Checkout surface.
 * Every route here writes to the real backend (through the real,
 * separately-credentialed `CheckoutBackendClient` — see that module's
 * own docblock) — this is Category B, the first write-capable Gateway
 * surface this platform has ever shipped, and it is scoped as narrowly
 * as `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §8 named: real guest
 * checkout, no customer authentication guard, no session persistence
 * beyond what one orchestrated request needs.
 */
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { BackendClient } from '../backend/client.js';
import type { CheckoutBackendClient } from '../backend/checkoutClient.js';
import { toGatewayError, GatewayError } from '../lib/errors.js';
import { orchestrateGuestCheckout } from '../checkout/orchestrator.js';
import { resolveShippingOptions } from '../checkout/shippingQuotes.js';

const addressSchema = z.object({
  recipientName: z.string().min(1),
  phone: z.string().optional().nullable(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(1),
  region: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  countryCode: z.string().length(2),
});

const submitBodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  currencyCode: z.string().length(3),
  address: addressSchema,
  shippingOptionId: z.string().min(1),
  paymentGatewayCode: z.string().min(1),
  lines: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive() })).min(1),
  idempotencyKey: z.string().min(1),
});

const shippingOptionsBodySchema = z.object({
  countryCode: z.string().length(2),
  region: z.string().optional().nullable(),
  lines: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive() })).min(1),
});

export function registerCheckoutRoutes(app: FastifyInstance, checkoutBackend: CheckoutBackendClient, backend: BackendClient, prefix: string): void {
  // Real, destination- and weight-aware shipping options — composed from
  // Catalog's real per-product weight and Shipping's real, multi-method
  // quote endpoint. See checkout/shippingQuotes.ts's own docblock for why
  // this is a POST (it needs a real destination and real cart lines, not
  // static, parameterless data) and for the honest empty-list behavior
  // when a real weight isn't available yet.
  app.post(`${prefix}/checkout/shipping-options`, async (request) => {
    const body = shippingOptionsBodySchema.parse(request.body);

    try {
      const options = await resolveShippingOptions({
        backend,
        checkoutBackend,
        destination: { countryCode: body.countryCode, region: body.region },
        lines: body.lines,
        correlationId: request.id,
      });
      return { data: options, meta: { requestId: request.id } };
    } catch (error) {
      throw toGatewayError(error, 'shipping');
    }
  });

  // The real, orchestrated Guest Checkout submission — see
  // checkout/orchestrator.ts's own docblock for the full real sequence.
  app.post(`${prefix}/checkout/submit`, async (request) => {
    const body = submitBodySchema.parse(request.body);

    try {
      const result = await orchestrateGuestCheckout(body, { backend: checkoutBackend, catalogBackend: backend, correlationId: request.id });
      return { data: result, meta: { requestId: request.id } };
    } catch (error) {
      if (error instanceof GatewayError) throw error;
      throw toGatewayError(error, 'checkout');
    }
  });
}
