import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { validateInboundEvent, UnknownEventNameError } from '../../../src/events/validator.js';
import type { ConsentState, EventIdentity } from '../../../src/events/types.js';

const identity: EventIdentity = { deviceId: 'device-1', sessionId: 'session-1' };
const consent: ConsentState = { necessary: true, analytics: true, marketing: false, personalization: false };

describe('events/validator', () => {
  it('validates a real registered event (product_viewed) and fills in defaults', () => {
    const event = validateInboundEvent(
      { name: 'product_viewed', source: 'browser', properties: { productId: '11111111-1111-1111-1111-111111111111' } },
      { identity, consent },
    );
    expect(event.name).toBe('product_viewed');
    expect(event.schemaVersion).toBe(1);
    expect(event.identity).toEqual(identity);
    expect(event.consent).toEqual(consent);
    expect(event.eventId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejects an unknown event name with UnknownEventNameError, never a generic failure', () => {
    expect(() => validateInboundEvent({ name: 'totally_made_up_event', source: 'browser' }, { identity, consent })).toThrow(UnknownEventNameError);
  });

  it('rejects a registered event whose properties fail its own schema, prefixing the event name onto the path', () => {
    try {
      validateInboundEvent({ name: 'product_viewed', source: 'browser', properties: { productId: 'not-a-uuid' } }, { identity, consent });
      expect.fail('expected a ZodError to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      if (error instanceof ZodError) {
        expect(error.issues[0]?.path[0]).toBe('product_viewed');
      }
    }
  });

  it('preserves a caller-supplied eventId (offline queue replay) rather than always minting a new one', () => {
    const suppliedId = '22222222-2222-2222-2222-222222222222';
    const event = validateInboundEvent({ eventId: suppliedId, name: 'page_viewed', source: 'offline', properties: { path: '/' } }, { identity, consent });
    expect(event.eventId).toBe(suppliedId);
  });

  it('threads the correlationId through when supplied', () => {
    const event = validateInboundEvent({ name: 'page_viewed', source: 'server', properties: { path: '/' } }, { identity, consent, correlationId: 'trace-abc' });
    expect(event.correlationId).toBe('trace-abc');
  });

  it('checkout_completed accepts real order/total/currency fields, matching the real backend event names it mirrors', () => {
    const event = validateInboundEvent(
      { name: 'checkout_completed', source: 'server', properties: { sessionId: 'sess-1', orderId: 'order-1', grandTotal: 49.99, currency: 'USD' } },
      { identity, consent },
    );
    expect(event.properties['grandTotal']).toBe(49.99);
  });
});
