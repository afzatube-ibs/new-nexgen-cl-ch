/**
 * Per-event-name Schema registry — CDP_ARCHITECTURE.md §4.2: "every event
 * `name` has a registered Zod Schema... validating `properties`' shape at
 * the point of capture... and again at the BFF ingestion endpoint." This
 * is that registry, real for the first time.
 *
 * A small, honest starter set — the storefront event vocabulary this
 * Gateway can validate today, without a Storefront yet existing to emit
 * anything richer. Extending it is additive: `registerEventSchema` is the
 * one seam every future event name goes through, never a bespoke
 * validation branch per event.
 */
import { z } from 'zod';

const registry = new Map<string, z.ZodTypeAny>();

export function registerEventSchema(name: string, schema: z.ZodTypeAny): void {
  registry.set(name, schema);
}

export function getEventSchema(name: string): z.ZodTypeAny | undefined {
  return registry.get(name);
}

export function knownEventNames(): string[] {
  return [...registry.keys()];
}

// --- Starter vocabulary (CDP_ARCHITECTURE.md §7.1's own Journey-analytics events) ---
registerEventSchema('page_viewed', z.object({ path: z.string(), title: z.string().optional(), referrer: z.string().optional() }));
registerEventSchema('product_viewed', z.object({ productId: z.string().uuid(), sku: z.string().optional(), price: z.number().nonnegative().optional() }));
registerEventSchema('category_viewed', z.object({ categoryId: z.string().uuid() }));
registerEventSchema('search_performed', z.object({ query: z.string().max(255), resultCount: z.number().int().nonnegative().optional() }));
registerEventSchema('added_to_cart', z.object({ productId: z.string().uuid(), quantity: z.number().int().positive() }));
registerEventSchema('removed_from_cart', z.object({ productId: z.string().uuid() }));
// checkout_started/checkout_completed/checkout_abandoned deliberately mirror the
// real backend's own already-published CheckoutStarted/CheckoutCompleted/
// CheckoutAbandoned domain events (LANDING_ENGINE_ARCHITECTURE.md §3.6) — same
// names, so a future correlationId join between the two streams is legible,
// not coincidental.
registerEventSchema('checkout_started', z.object({ sessionId: z.string() }));
registerEventSchema('checkout_completed', z.object({ sessionId: z.string(), orderId: z.string().optional(), grandTotal: z.number().nonnegative().optional(), currency: z.string().length(3).optional() }));
registerEventSchema('checkout_abandoned', z.object({ sessionId: z.string() }));
