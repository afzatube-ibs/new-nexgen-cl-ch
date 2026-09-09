/**
 * Storefront Inventory composition. Inventory owns the calculation; the
 * Gateway performs one batched read for all SKUs on a surface and attaches
 * only the aggregate quantity a shopper needs. Warehouse detail never
 * crosses this boundary.
 */
import type { FastifyBaseLogger } from 'fastify';
import type { BackendClient } from '../backend/client.js';

interface BackendAvailability {
  sku: string;
  totalAvailable: number;
}

export interface ComposedAvailability {
  totalAvailable: number;
}

export async function fetchComposedAvailability(
  backend: BackendClient,
  skus: string[],
  correlationId: string,
  logger?: FastifyBaseLogger,
): Promise<Map<string, ComposedAvailability>> {
  const uniqueSkus = [...new Set(skus.filter((sku) => sku.length > 0))];
  if (uniqueSkus.length === 0) return new Map();

  try {
    const response = await backend.getList<BackendAvailability>({
      module: 'inventory',
      path: 'inventory/availability-many',
      query: { skus: uniqueSkus.join(',') },
      correlationId,
    });

    const availability = new Map<string, ComposedAvailability>();
    for (const item of response.data) {
      availability.set(item.sku, { totalAvailable: item.totalAvailable });
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
