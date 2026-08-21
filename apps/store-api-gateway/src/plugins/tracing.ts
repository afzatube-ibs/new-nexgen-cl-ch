/**
 * Tracing plugin boundary — registers `tracing/tracing.ts`'s hooks only.
 * Owns: `request.traceId`, `request.traceStartedAt`, the `X-Trace-Id`
 * response header, and the structured `onResponse` completion log. Touches
 * no other capability's own state.
 */
import type { FastifyInstance } from 'fastify';
import { registerTracingHook } from '../tracing/tracing.js';

export function registerTracingPlugin(app: FastifyInstance): void {
  registerTracingHook(app);
}
