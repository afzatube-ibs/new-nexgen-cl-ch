import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { GatewayServices } from '../server.js';
import { fetchComposedAvailability } from '../composition/inventory.js';

const querySchema = z.object({
  skus: z.string().min(1).max(10000),
});

/**
 * Shopper-safe Inventory read. The backend service token remains entirely
 * inside the Gateway. Exact quantities and warehouse detail stay internal;
 * shoppers receive only a tri-state availability signal.
 */
export function registerInventoryRoutes(app: FastifyInstance, services: GatewayServices, prefix: string): void {
  app.get(`${prefix}/inventory/availability`, async (request) => {
    const query = querySchema.parse(request.query);
    const skus = query.skus
      .split(',')
      .map((sku) => sku.trim())
      .filter((sku) => sku.length > 0)
      .slice(0, 100);

    const availability = await fetchComposedAvailability(services.backend, skus, request.id, request.log);

    return {
      data: skus.map((sku) => {
        const item = availability.get(sku);
        return {
          sku,
          isAvailable: item ? item.totalAvailable > 0 : null,
        };
      }),
      meta: { requestId: request.id },
    };
  });
}
