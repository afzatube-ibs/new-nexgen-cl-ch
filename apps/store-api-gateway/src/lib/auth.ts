/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts). Shared
 * by every route file that composes `CustomerBackendClient` (Category C)
 * — extracts the real customer's own bearer token from THIS request's
 * own `Authorization` header, set server-side by the Storefront's own
 * Next.js Route Handler (which is the only place the real, httpOnly-
 * cookie-held token is ever read — see backend/customerBackendClient.ts's
 * own docblock). Never inspects, decodes, or validates the token itself —
 * that is the real backend's own job.
 */
import type { FastifyRequest } from 'fastify';

export function bearerTokenFrom(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length);
}
