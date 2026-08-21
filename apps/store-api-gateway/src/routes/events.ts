/**
 * POST /v1/events — the Browser → Gateway ingestion endpoint this slice's
 * own Event Pipeline diagram names. Validates (events/validator.ts),
 * attaches this request's own already-resolved identity/consent/
 * correlation (Guest Session + Personalization, both already-registered
 * plugins), and hands the result to `app.events.ingest()` — this route
 * itself contains zero destination-specific logic, per this slice's own
 * explicit rule.
 */
import { z, ZodError } from 'zod';
import type { FastifyInstance } from 'fastify';
import { validateInboundEvent, UnknownEventNameError } from '../events/validator.js';
import { GatewayError } from '../lib/errors.js';
import type { ConsentState } from '../events/types.js';

const consentSchema = z.object({
  analytics: z.boolean().default(false),
  marketing: z.boolean().default(false),
  personalization: z.boolean().default(false),
});

const inboundBodySchema = z.object({
  eventId: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  schemaVersion: z.number().int().positive().optional(),
  occurredAt: z.string().datetime().optional(),
  source: z.enum(['browser', 'server', 'hybrid', 'offline']),
  properties: z.record(z.string(), z.unknown()).optional(),
  consent: consentSchema.optional(),
});

export function registerEventRoutes(app: FastifyInstance, prefix: string): void {
  app.post(`${prefix}/events`, async (request, reply) => {
    const body = inboundBodySchema.parse(request.body);
    const consent: ConsentState = { necessary: true, ...(body.consent ?? { analytics: false, marketing: false, personalization: false }) };

    let cdpEvent;
    try {
      cdpEvent = validateInboundEvent(body, {
        identity: { deviceId: request.guestIdentity.deviceId, sessionId: request.id },
        consent,
        correlationId: request.traceId,
      });
    } catch (error) {
      if (error instanceof UnknownEventNameError) {
        throw GatewayError.validation([{ field: 'name', message: error.message }]);
      }
      if (error instanceof ZodError) throw error; // caught by the global handler's own ZodError branch
      throw error;
    }

    const { queuedFor } = await app.events.ingest(cdpEvent);
    reply.code(202);
    return { data: { eventId: cdpEvent.eventId, queuedFor }, meta: { requestId: request.id } };
  });

  // Operational visibility into the pipeline's own health — dead-letter
  // size is a real, actionable signal (STORE_API_GATEWAY_ARCHITECTURE.md
  // §7.2's own observability requirement, applied to this new subsystem).
  app.get(`${prefix}/events/health`, async (request) => {
    const deadLetterSize = await app.eventQueue.deadLetterSize();
    return {
      data: {
        queueAvailable: app.eventQueue.isAvailable(),
        deadLetterSize,
        availableDestinations: app.destinations.availableDestinations().map((d) => d.id),
        registeredDestinations: app.destinations.all().map((d) => d.id),
      },
      meta: { requestId: request.id },
    };
  });
}
