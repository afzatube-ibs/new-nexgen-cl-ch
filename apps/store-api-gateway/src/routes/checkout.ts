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
import type { CheckoutBackendClient } from '../backend/checkoutClient.js';
import { toGatewayError, GatewayError } from '../lib/errors.js';
import { orchestrateGuestCheckout } from '../checkout/orchestrator.js';
import type { BackendEnvelope, BackendShippingOption } from '../checkout/types.js';

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

export function registerCheckoutRoutes(app: FastifyInstance, checkoutBackend: CheckoutBackendClient, prefix: string): void {
  // Real, live shipping options — Checkout's own real, backend-owned
  // ShippingOptionCatalog (see orchestrator.ts's own docblock for the
  // honest scope note distinguishing this from the separate, unconnected
  // Shipping Zones/Rates module).
  app.get(`${prefix}/checkout/shipping-options`, async (request) => {
    try {
      const response = await checkoutBackend.get<BackendEnvelope<BackendShippingOption[]>>({
        module: 'shipping',
        path: 'checkout/shipping-options',
        correlationId: request.id,
      });
      return { data: response.data, meta: { requestId: request.id } };
    } catch (error) {
      throw toGatewayError(error, 'shipping');
    }
  });

  // The real, orchestrated Guest Checkout submission — see
  // checkout/orchestrator.ts's own docblock for the full real sequence.
  app.post(`${prefix}/checkout/submit`, async (request) => {
    const body = submitBodySchema.parse(request.body);

    try {
      const result = await orchestrateGuestCheckout(body, { backend: checkoutBackend, correlationId: request.id });
      return { data: result, meta: { requestId: request.id } };
    } catch (error) {
      if (error instanceof GatewayError) throw error;
      throw toGatewayError(error, 'checkout');
    }
  });
}
