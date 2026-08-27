/**
 * Beta Sprint 5 — real Guest Order Lookup. The real backend's own Orders
 * module has no guest-facing lookup route at all (every route is staff-
 * `auth:sanctum`-gated, confirmed from source) — this route is the
 * Gateway's own real, narrow proxy: it calls the real, already-built
 * staff-facing `GET /orders?q=` search (via the same real, separately-
 * credentialed Checkout Service Account used throughout this sprint,
 * holding only `orders.orders.view` — never `.manage`), then applies a
 * real authorization check *at the Gateway* before ever returning
 * anything: the caller must supply the exact order number **and** the
 * exact email address the real order was placed under. A mismatch on
 * either returns the identical, generic 404 a wrong order number would
 * — this route never confirms or denies that a given order number
 * exists, so it cannot be used to enumerate real orders.
 */
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { CheckoutBackendClient } from '../backend/checkoutClient.js';
import { toGatewayError, GatewayError } from '../lib/errors.js';
import type { BackendEnvelope, BackendOrderSummary } from '../checkout/types.js';

const lookupQuerySchema = z.object({
  orderNumber: z.string().min(1).max(255),
  email: z.string().email(),
});

export function registerOrderLookupRoutes(app: FastifyInstance, checkoutBackend: CheckoutBackendClient, prefix: string): void {
  app.get(`${prefix}/orders/lookup`, async (request) => {
    const query = lookupQuerySchema.parse(request.query);

    let orders: BackendOrderSummary[];
    try {
      const response = await checkoutBackend.get<BackendEnvelope<BackendOrderSummary[]>>({
        module: 'orders',
        path: 'orders',
        query: { q: query.orderNumber },
        correlationId: request.id,
      });
      orders = response.data;
    } catch (error) {
      throw toGatewayError(error, 'orders');
    }

    const match = orders.find(
      (order) =>
        order.orderNumber.toLowerCase() === query.orderNumber.toLowerCase() &&
        order.customerEmail.toLowerCase() === query.email.toLowerCase(),
    );

    if (!match) {
      throw GatewayError.notFound("We couldn't find an order matching that order number and email.");
    }

    return { data: match, meta: { requestId: request.id } };
  });
}
