/**
 * Inventory → Storefront availability composition. Inventory owns the real
 * calculation (on-hand minus reserved, active warehouses only); Gateway only
 * batches the read and attaches the backend's available/not-available result
 * to Catalog products.
 *
 * Availability fails open to `null`, not to "in stock": an Inventory outage
 * must not take down Catalog browsing and must never fabricate availability.
 */
import type { FastifyBaseLogger } from 'fastify';
import type { BackendClient } from '../backend/client.js';

interface BackendAvailability {
  sku: string;
  totalAvailable: number;
  isAvailable: boolean;
}

export interface ComposedAvailability {
  isAvailable: boolean;
}

export async function fetchComposedAvailability(
  backend: BackendClient,
  skus: string[],
  correlationId: string,
  logger?: FastifyBaseLogger,
): Promise<Map<string, ComposedAvailability>> {
  const uniqueSkus = [...new Set(skus.filter((sku) => sku.length > 0).map((sku) => sku.toUpperCase()))];
  if (uniqueSkus.length === 0) return new Map();

  try {
    const response = await backend.getList<BackendAvailability>({
      module: 'inventory',
      path: 'inventory/availability-many',
      query: { skus: uniqueSkus.join(',') },
      correlationId,
    });

    const availability = new Map<string, ComposedAvailability>();
    for (const entry of response.data) {
      availability.set(entry.sku.toUpperCase(), { isAvailable: entry.isAvailable });
    }

    return availability;
  } catch (error) {
    logger?.warn(
      { err: error, correlationId },
      'Inventory composition failed — degrading to unknown availability, Catalog browsing continues',
    );
    return new Map();
  }
}
