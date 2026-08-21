/**
 * Request Tracing — this slice's own requirement: "Correlation ID, Trace
 * ID, Timing, structured logging, cross-service propagation." Slice 1
 * already gave every request a Request ID (`server.ts`'s `genReqId`) and
 * propagated it to the backend as `X-Correlation-Id`
 * (`backend/client.ts`). This module adds the two things Slice 1 did not
 * yet have:
 *
 *   - **Trace ID**, distinct from Request ID by design: a Trace ID spans a
 *     whole visitor session/journey across MANY requests (accepted from an
 *     incoming `X-Trace-Id` header when a caller already has one —
 *     typically the Storefront's own client-side session — generated once
 *     and returned when absent), where a Request ID is unique to this one
 *     HTTP request alone. Conflating the two would make it impossible to
 *     later answer "show me everything this one visitor's journey
 *     touched," only "show me this one request" — CDP_ARCHITECTURE.md
 *     §7.1's own Journey-analytics need, made concrete at the tracing
 *     layer.
 *   - **Timing**: real response-time measurement, logged structurally on
 *     every request, per `ENGINEERING:OBSERVABILITY`'s already-Accepted
 *     platform-wide requirement.
 */
import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const TRACE_HEADER = 'x-trace-id';

declare module 'fastify' {
  interface FastifyRequest {
    traceId: string;
    /** High-resolution start time (ms, `performance.now()`-based) — used only to compute the Timing log field, never exposed directly. */
    traceStartedAt: number;
  }
}

export function registerTracingHook(app: FastifyInstance): void {
  app.addHook('onRequest', (request: FastifyRequest, reply: FastifyReply, done) => {
    const incoming = request.headers[TRACE_HEADER];
    request.traceId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
    request.traceStartedAt = performance.now();
    reply.header('X-Trace-Id', request.traceId);
    done();
  });

  app.addHook('onResponse', (request: FastifyRequest, reply: FastifyReply, done) => {
    const durationMs = performance.now() - request.traceStartedAt;
    request.log.info(
      {
        requestId: request.id,
        traceId: request.traceId,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      },
      'request completed',
    );
    done();
  });
}
