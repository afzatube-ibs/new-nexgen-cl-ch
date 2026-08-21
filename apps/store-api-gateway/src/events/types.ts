/**
 * The CDP event envelope — CDP_ARCHITECTURE.md §4.1, implemented for real
 * here for the first time. Deliberately a SECOND stream from the real
 * backend's own `DomainEventBus` (Fulfillment/Orders/etc.) — CDP_ARCHITECTURE.md
 * §1's own governing rule: behavioral telemetry must never share infrastructure
 * with commerce-correctness events, so a destination outage can never
 * degrade a real commerce operation.
 */

export type EventSource = 'browser' | 'server' | 'hybrid' | 'offline';

export interface ConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

export interface EventIdentity {
  deviceId: string;
  sessionId: string;
  customerId?: string;
  guestId?: string;
}

/**
 * CDP_ARCHITECTURE.md §4.1's own envelope shape, implemented field-for-field.
 * `properties` is validated against the named event's own registered Zod
 * schema (events/schemas.ts) — never trusted as free-form.
 */
export interface CdpEvent {
  eventId: string;
  name: string;
  schemaVersion: number;
  occurredAt: string;
  source: EventSource;
  identity: EventIdentity;
  consent: ConsentState;
  correlationId?: string;
  properties: Record<string, unknown>;
}

/** The shape a caller (browser SDK, or a server-side emitter) submits — `eventId`/`occurredAt` may be client-assigned (offline queue replay) or server-assigned (the common case). */
export interface InboundEventPayload {
  eventId?: string;
  name: string;
  schemaVersion?: number;
  occurredAt?: string;
  source: EventSource;
  properties?: Record<string, unknown>;
}
