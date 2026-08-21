/**
 * Events plugin boundary — Gateway Plugin Architecture, this slice's own
 * requirement: a named boundary for "Tracking." Owns: the `EventQueue`,
 * `DestinationRegistry`, and `EventPipeline` instances; registers every
 * known destination (webhook, warehouse, and the honestly-stubbed
 * Meta/GA4/TikTok adapters); starts the pipeline's background worker.
 * No other plugin reaches into this one's internals — every other plugin
 * that needs to emit an event does so only through `app.events.ingest()`.
 */
import type { FastifyInstance } from 'fastify';
import type { Env } from '../config/env.js';
import { createInMemoryEventQueue, createRedisEventQueue, type EventQueue } from '../events/queue.js';
import { EventPipeline } from '../events/pipeline.js';
import { DestinationRegistry } from '../destinations/registry.js';
import { createWebhookDestination } from '../destinations/adapters/webhookDestination.js';
import { createWarehouseDestination } from '../destinations/adapters/warehouseDestination.js';
import { createStubDestination } from '../destinations/adapters/stubDestination.js';

declare module 'fastify' {
  interface FastifyInstance {
    events: EventPipeline;
    eventQueue: EventQueue;
    destinations: DestinationRegistry;
  }
}

export interface EventsPluginOptions {
  env: Env;
  /** Injectable for tests — defaults to a real Redis-backed queue. */
  queue?: EventQueue;
}

export function registerEventsPlugin(app: FastifyInstance, options: EventsPluginOptions): () => void {
  const { env } = options;

  const registry = new DestinationRegistry();
  registry.register(createWebhookDestination('webhook', env.EVENTS_WEBHOOK_URL));
  registry.register(createWarehouseDestination(env.REDIS_URL, env.REDIS_KEY_PREFIX, app.log));
  registry.register(createStubDestination({ id: 'meta-capi', apiKey: env.META_CAPI_ACCESS_TOKEN }));
  registry.register(createStubDestination({ id: 'ga4', apiKey: env.GA4_API_SECRET }));
  registry.register(createStubDestination({ id: 'tiktok-events', apiKey: env.TIKTOK_EVENTS_ACCESS_TOKEN }));

  const queue = options.queue ?? createRedisEventQueue(env.REDIS_URL, `${env.REDIS_KEY_PREFIX}evt:`, app.log);
  const pipeline = new EventPipeline(queue, registry, app.log);

  app.decorate('events', pipeline);
  app.decorate('eventQueue', queue);
  app.decorate('destinations', registry);

  const stopWorker = env.NODE_ENV === 'test' ? () => undefined : pipeline.startWorker(1000);

  app.addHook('onClose', async () => {
    stopWorker();
    await queue.close();
  });

  return stopWorker;
}

/** Test-only convenience — an in-memory queue, no real Redis required. */
export function registerTestEventsPlugin(app: FastifyInstance, env: Env): void {
  registerEventsPlugin(app, { env, queue: createInMemoryEventQueue() });
}
