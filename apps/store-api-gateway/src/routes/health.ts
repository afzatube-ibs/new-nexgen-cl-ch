/**
 * Health / Readiness / Liveness — DEPLOYMENT:OPERATIONAL_READINESS's
 * already-Accepted platform-wide requirement, made concrete for this
 * service. Three distinct signals, per this slice's own explicit
 * requirement, each answering a different operational question:
 *   - /health   — human/dashboard-facing summary (dependency states included)
 *   - /health/live  — "is this process alive at all" (orchestrator restart signal — must never depend on a downstream service)
 *   - /health/ready — "can this process currently serve real traffic" (orchestrator routing signal — depends on Redis/backend reachability)
 */
import type { FastifyInstance } from 'fastify';
import type { GatewayServices } from '../server.js';

export function registerHealthRoutes(app: FastifyInstance, services: GatewayServices): void {
  app.get('/health/live', () => ({ status: 'alive' }));

  app.get('/health/ready', (_request, reply) => {
    const cacheAvailable = services.cache.isAvailable();
    const ready = cacheAvailable; // the backend's own reachability is checked per-call via circuit breakers, not blocking readiness on a synchronous probe here
    reply.code(ready ? 200 : 503);
    return { status: ready ? 'ready' : 'not_ready', dependencies: { cache: cacheAvailable ? 'up' : 'down' } };
  });

  app.get('/health', () => ({
    status: 'ok',
    service: 'store-api-gateway',
    dependencies: {
      cache: services.cache.isAvailable() ? 'up' : 'degraded',
      backendCatalogCircuit: services.backend.circuitStateFor('catalog'),
      backendSearchCircuit: services.backend.circuitStateFor('search'),
      eventQueue: app.eventQueue.isAvailable() ? 'up' : 'degraded',
    },
    platformServices: {
      availableDestinations: app.destinations.availableDestinations().map((d) => d.id),
      registeredDestinations: app.destinations.all().map((d) => d.id),
      registeredFlagCount: app.flags.evaluateAll({ environment: services.env.NODE_ENV }).length,
    },
    uptimeSeconds: Math.round(process.uptime()),
  }));
}
