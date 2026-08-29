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
import type { CustomerBackendClient } from '../backend/customerBackendClient.js';
import { bearerTokenFrom } from '../lib/auth.js';
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

const mineIndexQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  per_page: z.coerce.number().int().positive().max(100).optional(),
});

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — real
 * order history for a logged-in customer, composed through
 * `CustomerBackendClient` (Category C) onto the real backend's own
 * `GET /orders/mine`/`GET /orders/mine/{order}`. Distinct from
 * `registerOrderLookupRoutes` above (guest, email-verified, Category B)
 * — this requires the caller's own real customer token; there is no
 * email-matching fallback, because the real backend's own
 * `CustomerOrderController` already scopes every query to the token's
 * own customer id, never trusting a caller-supplied identifier.
 */
export function registerCustomerOrderRoutes(app: FastifyInstance, customerBackend: CustomerBackendClient, prefix: string): void {
  app.get(`${prefix}/orders/mine`, async (request) => {
    const customerToken = bearerTokenFrom(request);
    if (!customerToken) throw GatewayError.unauthenticated();
    const query = mineIndexQuerySchema.parse(request.query);
    try {
      const result = await customerBackend.get<{
        data: unknown;
        meta?: { current_page?: number; currentPage?: number; last_page?: number; lastPage?: number; per_page?: number; perPage?: number; total?: number };
      }>({ module: 'orders', path: 'orders/mine', customerToken, query, correlationId: request.id });
      const data = result.data as unknown[];
      // Reshapes the real backend's own raw Laravel paginator meta
      // (current_page/last_page/...) into this Gateway's one normalized
      // `meta.pagination` shape (camelCase) — the identical pattern every
      // Catalog list route already establishes (routes/catalog.ts), never
      // a route-specific ad hoc shape.
      return {
        data,
        meta: {
          requestId: request.id,
          pagination: result.meta
            ? {
                currentPage: result.meta.current_page ?? result.meta.currentPage ?? 1,
                lastPage: result.meta.last_page ?? result.meta.lastPage ?? 1,
                perPage: result.meta.per_page ?? result.meta.perPage ?? data.length,
                total: result.meta.total ?? data.length,
              }
            : undefined,
        },
      };
    } catch (error) {
      throw toGatewayError(error, 'orders');
    }
  });

  app.get(`${prefix}/orders/mine/:orderId`, async (request) => {
    const { orderId } = z.object({ orderId: z.string().uuid() }).parse(request.params);
    const customerToken = bearerTokenFrom(request);
    if (!customerToken) throw GatewayError.unauthenticated();
    try {
      const result = await customerBackend.get({ module: 'orders', path: `orders/mine/${orderId}`, customerToken, correlationId: request.id });
      return { data: (result as { data: unknown }).data, meta: { requestId: request.id } };
    } catch (error) {
      throw toGatewayError(error, 'orders');
    }
  });
}
