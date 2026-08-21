/**
 * Validates an InboundEventPayload into a real, fully-formed CdpEvent —
 * CDP_ARCHITECTURE.md §4.2/§4.4. A malformed event, or an event name with
 * no registered Schema, is REJECTED with a specific reason (never silently
 * dropped, per that section's own rule) — the caller (routes/events.ts)
 * turns this into a structured 422, exactly like every other validation
 * failure in this Gateway (lib/errors.ts's ZodError branch).
 */
import { randomUUID } from 'node:crypto';
import { z, ZodError } from 'zod';
import { getEventSchema } from './schemas.js';
import type { CdpEvent, ConsentState, EventIdentity, InboundEventPayload } from './types.js';

export class UnknownEventNameError extends Error {
  constructor(public readonly eventName: string) {
    super(`No schema is registered for event "${eventName}".`);
    this.name = 'UnknownEventNameError';
  }
}

const inboundEnvelopeSchema = z.object({
  eventId: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  schemaVersion: z.number().int().positive().optional(),
  occurredAt: z.string().datetime().optional(),
  source: z.enum(['browser', 'server', 'hybrid', 'offline']),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export interface ValidateEventOptions {
  identity: EventIdentity;
  consent: ConsentState;
  correlationId?: string;
}

/**
 * @throws {ZodError} if the envelope itself, or the event-specific `properties` shape, is invalid.
 * @throws {UnknownEventNameError} if `name` has no registered schema.
 */
export function validateInboundEvent(payload: InboundEventPayload, options: ValidateEventOptions): CdpEvent {
  const envelope = inboundEnvelopeSchema.parse(payload);

  const propertySchema = getEventSchema(envelope.name);
  if (!propertySchema) {
    throw new UnknownEventNameError(envelope.name);
  }

  let properties: Record<string, unknown>;
  try {
    properties = propertySchema.parse(envelope.properties ?? {}) as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ZodError) {
      // Re-thrown with the event name prefixed onto each path so a caller
      // debugging a rejected event can tell which event's own properties
      // failed, not just that "properties" failed in the abstract.
      throw new ZodError(error.issues.map((issue) => ({ ...issue, path: [envelope.name, ...issue.path] })));
    }
    throw error;
  }

  return {
    eventId: envelope.eventId ?? randomUUID(),
    name: envelope.name,
    schemaVersion: envelope.schemaVersion ?? 1,
    occurredAt: envelope.occurredAt ?? new Date().toISOString(),
    source: envelope.source,
    identity: options.identity,
    consent: options.consent,
    correlationId: options.correlationId,
    properties,
  };
}
