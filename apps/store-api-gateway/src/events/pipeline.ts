/**
 * The Event Pipeline — this slice's own required shape: "Browser → Gateway
 * → Event Pipeline → Destinations. Events must NOT contain destination-
 * specific business logic. Everything should use adapters."
 *
 * `ingest()` (called from routes/events.ts, already-validated CdpEvent)
 * fans a single event out to every currently-available Destination as an
 * independent queued delivery — one destination's own outage never blocks
 * another's delivery of the same event (STORE_API_GATEWAY_ARCHITECTURE.md
 * §3.2's circuit-isolation discipline, applied here to destinations
 * instead of backend modules). `processOnce()` is the worker step: dequeue
 * ready deliveries, attempt each, requeue-with-backoff or dead-letter on
 * failure (CDP_ARCHITECTURE.md §4.4) — exposed as a directly-callable,
 * synchronous-per-call method (not only a hidden interval) specifically so
 * it is deterministically testable without waiting on real timers.
 */
import type { FastifyBaseLogger } from 'fastify';
import type { EventQueue } from './queue.js';
import type { DestinationRegistry } from '../destinations/registry.js';
import type { CdpEvent } from './types.js';

export interface ProcessResult {
  processed: number;
  delivered: number;
  requeued: number;
  deadLettered: number;
}

export class EventPipeline {
  constructor(
    private readonly queue: EventQueue,
    private readonly registry: DestinationRegistry,
    private readonly logger: FastifyBaseLogger,
    private readonly maxAttempts = 5,
  ) {}

  async ingest(event: CdpEvent): Promise<{ queuedFor: string[] }> {
    const destinations = this.registry.availableDestinations();
    await Promise.all(destinations.map((destination) => this.queue.enqueue(event, destination.id)));
    return { queuedFor: destinations.map((d) => d.id) };
  }

  async processOnce(batchSize = 20): Promise<ProcessResult> {
    const items = await this.queue.dequeueReady(batchSize);
    const result: ProcessResult = { processed: items.length, delivered: 0, requeued: 0, deadLettered: 0 };

    await Promise.all(
      items.map(async (item) => {
        const destination = this.registry.get(item.destination);
        if (!destination) {
          // The destination was removed/renamed since this item was
          // queued — dead-letter immediately rather than retry forever
          // against something that can never succeed.
          await this.queue.requeueWithBackoff({ ...item, attempts: this.maxAttempts }, this.maxAttempts);
          result.deadLettered += 1;
          return;
        }

        try {
          const delivery = await destination.send(item.event);
          if (delivery.delivered) {
            result.delivered += 1;
            return;
          }
          this.logger.debug({ eventId: item.event.eventId, destination: item.destination, reason: delivery.reason }, 'Event delivery failed, will retry with backoff');
          const outcome = await this.queue.requeueWithBackoff(item, this.maxAttempts);
          if (outcome === 'dead-lettered') result.deadLettered += 1;
          else result.requeued += 1;
        } catch (error) {
          this.logger.warn({ err: error, eventId: item.event.eventId, destination: item.destination }, 'Destination threw during delivery');
          const outcome = await this.queue.requeueWithBackoff(item, this.maxAttempts);
          if (outcome === 'dead-lettered') result.deadLettered += 1;
          else result.requeued += 1;
        }
      }),
    );

    return result;
  }

  /** Runs `processOnce` on an interval — returns a stop function. Not started automatically; server.ts decides whether a worker loop runs in a given process. */
  startWorker(intervalMs = 1000): () => void {
    const timer = setInterval(() => {
      this.processOnce().catch((error: unknown) => {
        this.logger.warn({ err: error }, 'Event pipeline worker tick failed');
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }
}
