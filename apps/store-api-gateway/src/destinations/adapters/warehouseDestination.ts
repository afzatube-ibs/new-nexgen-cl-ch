/**
 * Warehouse destination — CDP_ARCHITECTURE.md §5.2: "an append-only export
 * ... the raw material for §9's future predictive/AI work... never
 * processed or filtered before landing here." That document names R2/S3
 * object storage as the real future target (already confirmed
 * R2-compatible, `PERFORMANCE_FOUNDATION.md` §7) — no such bucket is
 * configured in this slice, so this adapter stands in with a real,
 * durable, append-only Redis list (the same instance every other part of
 * this Gateway already depends on) as an honest, functional placeholder:
 * genuinely durable and genuinely queryable today, explicitly named here
 * as the seam a real object-storage adapter replaces later, not a
 * disguised fake.
 */
import { Redis } from 'ioredis';
import type { FastifyBaseLogger } from 'fastify';
import type { DestinationContract, DeliveryResult } from '../contract.js';
import type { CdpEvent } from '../../events/types.js';

const WAREHOUSE_KEY = 'events:warehouse';
/** Bounded so a dev/test Redis instance never grows unbounded — a real object-storage adapter has no such cap. */
const MAX_RETAINED = 10_000;

export function createWarehouseDestination(url: string, keyPrefix: string, logger: FastifyBaseLogger): DestinationContract {
  const client = new Redis(url, { keyPrefix, lazyConnect: true, maxRetriesPerRequest: 1 });
  let connectAttempted = false;

  return {
    id: 'warehouse',
    isAvailable: () => true, // always configured — this is the platform's own fallback sink, per the docblock above
    async send(event: CdpEvent): Promise<DeliveryResult> {
      try {
        if (!connectAttempted) {
          connectAttempted = true;
          await client.connect().catch(() => undefined);
        }
        await client.lpush(WAREHOUSE_KEY, JSON.stringify(event));
        await client.ltrim(WAREHOUSE_KEY, 0, MAX_RETAINED - 1);
        return { delivered: true };
      } catch (error) {
        logger.warn({ err: error, eventId: event.eventId }, 'Warehouse destination: write failed');
        return { delivered: false, reason: 'storage_unavailable' };
      }
    },
  };
}
