/**
 * Durable event queue — CDP_ARCHITECTURE.md §4.4: "every ingested event is
 * written to a durable queue... before any Destination fan-out is
 * attempted — ingestion and delivery are decoupled, so a slow or failing
 * destination never blocks event capture itself." Redis-backed
 * (`ADR-0004`'s already-Accepted backbone, the same instance Slice 1's
 * cache already uses, on its own key prefix), with the identical
 * graceful-degradation posture as `lib/cacheStore.ts`: a Redis outage
 * degrades event durability, never crashes the Gateway or blocks a
 * request.
 *
 * Retry is exponential backoff, bounded (never infinite, §4.4) — an event
 * that exhausts its attempts lands in a Dead Letter Queue, inspectable and
 * replayable, never silently discarded (`PRINCIPLES:EXPLICIT_FAILURE`).
 */
import { Redis } from 'ioredis';
import type { FastifyBaseLogger } from 'fastify';
import type { CdpEvent } from './types.js';

export interface QueuedEvent {
  event: CdpEvent;
  destination: string;
  attempts: number;
}

export interface EventQueue {
  enqueue(event: CdpEvent, destination: string): Promise<void>;
  /** Pops up to `count` ready deliveries (nothing awaiting backoff) — never blocks. */
  dequeueReady(count: number): Promise<QueuedEvent[]>;
  requeueWithBackoff(item: QueuedEvent, maxAttempts: number): Promise<'requeued' | 'dead-lettered'>;
  deadLetterSize(): Promise<number>;
  listDeadLetters(count: number): Promise<QueuedEvent[]>;
  replayDeadLetter(eventId: string, destination: string): Promise<boolean>;
  isAvailable(): boolean;
  close(): Promise<void>;
}

const READY_KEY = 'events:ready';
const DELAYED_KEY = 'events:delayed'; // sorted set, score = readyAt epoch ms
const DEAD_LETTER_KEY = 'events:dead-letter';

function backoffMs(attempts: number): number {
  return Math.min(attempts * attempts * 500, 30_000);
}

export function createRedisEventQueue(url: string, keyPrefix: string, logger: FastifyBaseLogger): EventQueue {
  let available = true;
  const client = new Redis(url, {
    keyPrefix,
    retryStrategy: (times: number) => Math.min(times * 200, 2000),
    maxRetriesPerRequest: 1,
  });

  client.on('error', (error: Error) => {
    if (available) logger.warn({ err: error }, 'Event queue: Redis connection error — events will not be durably queued until it recovers');
    available = false;
  });
  client.on('ready', () => {
    if (!available) logger.info('Event queue: Redis connection recovered');
    available = true;
  });

  async function moveDueDelayedToReady(): Promise<void> {
    const due = await client.zrangebyscore(DELAYED_KEY, 0, Date.now());
    if (due.length === 0) return;
    const pipeline = client.pipeline();
    for (const item of due) {
      pipeline.lpush(READY_KEY, item);
      pipeline.zrem(DELAYED_KEY, item);
    }
    await pipeline.exec();
  }

  return {
    isAvailable: () => available,

    async enqueue(event, destination) {
      if (!available) return;
      const item: QueuedEvent = { event, destination, attempts: 0 };
      try {
        await client.lpush(READY_KEY, JSON.stringify(item));
      } catch (error) {
        logger.warn({ err: error, eventId: event.eventId }, 'Event queue: enqueue failed, event dropped from durable delivery');
      }
    },

    async dequeueReady(count) {
      if (!available) return [];
      try {
        await moveDueDelayedToReady();
        const raw = await client.rpop(READY_KEY, count);
        if (!raw) return [];
        return raw.map((value) => JSON.parse(value) as QueuedEvent);
      } catch (error) {
        logger.warn({ err: error }, 'Event queue: dequeue failed');
        return [];
      }
    },

    async requeueWithBackoff(item, maxAttempts) {
      const next: QueuedEvent = { ...item, attempts: item.attempts + 1 };
      if (next.attempts >= maxAttempts) {
        await client.lpush(DEAD_LETTER_KEY, JSON.stringify(next));
        return 'dead-lettered';
      }
      await client.zadd(DELAYED_KEY, Date.now() + backoffMs(next.attempts), JSON.stringify(next));
      return 'requeued';
    },

    async deadLetterSize() {
      if (!available) return 0;
      return client.llen(DEAD_LETTER_KEY);
    },

    async listDeadLetters(count) {
      if (!available) return [];
      const raw = await client.lrange(DEAD_LETTER_KEY, 0, count - 1);
      return raw.map((value) => JSON.parse(value) as QueuedEvent);
    },

    async replayDeadLetter(eventId, destination) {
      const raw = await client.lrange(DEAD_LETTER_KEY, 0, -1);
      const match = raw.find((value) => {
        const parsed = JSON.parse(value) as QueuedEvent;
        return parsed.event.eventId === eventId && parsed.destination === destination;
      });
      if (!match) return false;
      await client.lrem(DEAD_LETTER_KEY, 1, match);
      const parsed = JSON.parse(match) as QueuedEvent;
      await client.lpush(READY_KEY, JSON.stringify({ ...parsed, attempts: 0 }));
      return true;
    },

    async close() {
      await client.quit();
    },
  };
}

/** In-memory fallback for unit/integration tests — mirrors createInMemoryCacheStore's own precedent. */
export function createInMemoryEventQueue(): EventQueue {
  let ready: QueuedEvent[] = [];
  let delayed: Array<{ readyAt: number; item: QueuedEvent }> = [];
  let deadLetters: QueuedEvent[] = [];

  return {
    isAvailable: () => true,
    enqueue(event, destination) {
      ready.push({ event, destination, attempts: 0 });
      return Promise.resolve();
    },
    dequeueReady(count) {
      const now = Date.now();
      const due = delayed.filter((d) => d.readyAt <= now);
      delayed = delayed.filter((d) => d.readyAt > now);
      ready.push(...due.map((d) => d.item));
      const popped = ready.slice(0, count);
      ready = ready.slice(count);
      return Promise.resolve(popped);
    },
    requeueWithBackoff(item, maxAttempts) {
      const next: QueuedEvent = { ...item, attempts: item.attempts + 1 };
      if (next.attempts >= maxAttempts) {
        deadLetters.push(next);
        return Promise.resolve('dead-lettered');
      }
      delayed.push({ readyAt: Date.now() + backoffMs(next.attempts), item: next });
      return Promise.resolve('requeued');
    },
    deadLetterSize() {
      return Promise.resolve(deadLetters.length);
    },
    listDeadLetters(count) {
      return Promise.resolve(deadLetters.slice(0, count));
    },
    replayDeadLetter(eventId, destination) {
      const index = deadLetters.findIndex((item) => item.event.eventId === eventId && item.destination === destination);
      if (index === -1) return Promise.resolve(false);
      const [item] = deadLetters.splice(index, 1);
      ready.push({ ...item!, attempts: 0 });
      return Promise.resolve(true);
    },
    close() {
      ready = [];
      delayed = [];
      deadLetters = [];
      return Promise.resolve();
    },
  };
}
