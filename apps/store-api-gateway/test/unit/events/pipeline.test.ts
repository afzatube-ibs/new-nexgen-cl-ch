import { describe, expect, it } from 'vitest';
import pino from 'pino';
import { EventPipeline } from '../../../src/events/pipeline.js';
import { createInMemoryEventQueue } from '../../../src/events/queue.js';
import { DestinationRegistry } from '../../../src/destinations/registry.js';
import type { DestinationContract } from '../../../src/destinations/contract.js';
import type { CdpEvent } from '../../../src/events/types.js';

const silentLogger = pino({ level: 'silent' });

function fakeEvent(): CdpEvent {
  return {
    eventId: '11111111-1111-1111-1111-111111111111',
    name: 'page_viewed',
    schemaVersion: 1,
    occurredAt: new Date().toISOString(),
    source: 'browser',
    identity: { deviceId: 'device-1', sessionId: 'session-1' },
    consent: { necessary: true, analytics: true, marketing: false, personalization: false },
    properties: { path: '/' },
  };
}

function alwaysSucceedsDestination(id: string): DestinationContract {
  return { id, isAvailable: () => true, send: () => Promise.resolve({ delivered: true }) };
}

function alwaysFailsDestination(id: string): DestinationContract {
  return { id, isAvailable: () => true, send: () => Promise.resolve({ delivered: false, reason: 'simulated_failure' }) };
}

function unavailableDestination(id: string): DestinationContract {
  return { id, isAvailable: () => false, send: () => Promise.resolve({ delivered: true }) };
}

describe('events/pipeline', () => {
  it('ingest() fans out only to currently-available destinations', async () => {
    const registry = new DestinationRegistry();
    registry.register(alwaysSucceedsDestination('a'));
    registry.register(unavailableDestination('b'));
    const queue = createInMemoryEventQueue();
    const pipeline = new EventPipeline(queue, registry, silentLogger);

    const { queuedFor } = await pipeline.ingest(fakeEvent());
    expect(queuedFor).toEqual(['a']);
  });

  it('processOnce delivers a successful event and reports it as delivered', async () => {
    const registry = new DestinationRegistry();
    registry.register(alwaysSucceedsDestination('a'));
    const queue = createInMemoryEventQueue();
    const pipeline = new EventPipeline(queue, registry, silentLogger);

    await pipeline.ingest(fakeEvent());
    const result = await pipeline.processOnce();
    expect(result).toEqual({ processed: 1, delivered: 1, requeued: 0, deadLettered: 0 });
  });

  it('processOnce requeues a failed delivery with backoff rather than dropping it', async () => {
    const registry = new DestinationRegistry();
    registry.register(alwaysFailsDestination('a'));
    const queue = createInMemoryEventQueue();
    const pipeline = new EventPipeline(queue, registry, silentLogger, 5);

    await pipeline.ingest(fakeEvent());
    const result = await pipeline.processOnce();
    expect(result).toEqual({ processed: 1, delivered: 0, requeued: 1, deadLettered: 0 });
    expect(await queue.deadLetterSize()).toBe(0);
  });

  it('dead-letters an event once it exceeds maxAttempts, never retrying forever', async () => {
    const registry = new DestinationRegistry();
    registry.register(alwaysFailsDestination('a'));
    const queue = createInMemoryEventQueue();
    const pipeline = new EventPipeline(queue, registry, silentLogger, 1); // maxAttempts=1: first failure dead-letters immediately

    await pipeline.ingest(fakeEvent());
    const result = await pipeline.processOnce();
    expect(result.deadLettered).toBe(1);
    expect(await queue.deadLetterSize()).toBe(1);
  });

  it('a destination throwing is treated the same as a returned delivered:false — requeued, never crashes the pipeline', async () => {
    const registry = new DestinationRegistry();
    registry.register({ id: 'a', isAvailable: () => true, send: () => Promise.reject(new Error('boom')) });
    const queue = createInMemoryEventQueue();
    const pipeline = new EventPipeline(queue, registry, silentLogger, 5);

    await pipeline.ingest(fakeEvent());
    const result = await pipeline.processOnce();
    expect(result.requeued).toBe(1);
  });
});

describe('destinations/registry', () => {
  it('availableDestinations() filters to only isAvailable()===true entries', () => {
    const registry = new DestinationRegistry();
    registry.register(alwaysSucceedsDestination('a'));
    registry.register(unavailableDestination('b'));
    expect(registry.availableDestinations().map((d) => d.id)).toEqual(['a']);
    expect(registry.all().map((d) => d.id)).toEqual(['a', 'b']);
  });
});
