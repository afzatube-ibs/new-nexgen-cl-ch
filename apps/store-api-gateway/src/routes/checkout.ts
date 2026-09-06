/**
 * Storefront Guest Checkout surface. Every route here composes the real
 * backend through the separately-credentialed CheckoutBackendClient.
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

interface BackendPaymentMethod {
  code: string;
  label: string;
  available: boolean;
}

export interface CheckoutPaymentMethod {
  code: string;
  label: string;
}

export function registerCheckoutRoutes(app: FastifyInstance, checkoutBackend: CheckoutBackendClient, backend: BackendClient, prefix: string): void {
  /**
   * Real availability boundary: the backend Payment Gateway Registry is the
   * sole authority on what can be offered. Its default `payments/methods`
   * response already excludes registered-but-unconfigured gateways, so this
   * route never derives availability from frontend constants.
   */
  app.get(`${prefix}/checkout/payment-methods`, async (request) => {
    try {
      const response = await checkoutBackend.get<{ data: BackendPaymentMethod[] }>({
        module: 'payments',
        path: 'payments/methods',
        correlationId: request.id,
      });

      return {
        data: response.data.filter((method) => method.available).map((method) => ({ code: method.code, label: method.label } satisfies CheckoutPaymentMethod)),
        meta: { requestId: request.id },
      };
    } catch (error) {
      throw toGatewayError(error, 'payments');
    }
  });

  // Real, destination- and weight-aware shipping options — composed from
  // Catalog's real per-product weight and Shipping's real quote endpoint.
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

  // Real, orchestrated Guest Checkout submission.
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
