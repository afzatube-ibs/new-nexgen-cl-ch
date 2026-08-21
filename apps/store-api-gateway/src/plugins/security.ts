/**
 * Security pipeline stages — Rate Limit (per §3.1 of
 * STORE_API_GATEWAY_ARCHITECTURE.md) and security headers/CORS. Explicitly
 * NOT customer authentication, per this slice's own scope: "NO customer
 * authentication."
 */
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import type { Env } from '../config/env.js';
import { GatewayError } from '../lib/errors.js';

export async function registerSecurityPlugins(app: FastifyInstance, env: Env): Promise<void> {
  // Security headers — a public-facing, anonymous-callable surface has no
  // defense-in-depth layer above it the way the staff-only backend has
  // (SECURITY:DEFENSE_IN_DEPTH), so this Gateway must not skip what a
  // browser-facing API can cheaply get for free.
  await app.register(helmet, {
    contentSecurityPolicy: false, // this Gateway serves JSON only, never HTML — CSP is the Storefront's own concern
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  await app.register(cors, {
    origin: env.CORS_ALLOWED_ORIGINS.length > 0 ? env.CORS_ALLOWED_ORIGINS : false,
    credentials: true, // required for the guest-session cookie (§ context/guestSession.ts) to round-trip
  });

  // Materially stricter on writes than reads, per STORE_API_GATEWAY_
  // ARCHITECTURE.md §3.1 — this slice ships read-only routes only, so one
  // global limit is correct today; a future write-shaped route (cart
  // mutation, once Category B exists) gets its own, stricter limit rather
  // than reusing this one, per that same section's own explicit rule.
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    // Rate limit by guest device identity when known, falling back to IP —
    // keyed the same way CDP_ARCHITECTURE.md §3.1's identity ladder scopes
    // every other per-visitor signal, not a separate scheme.
    keyGenerator: (request) => {
      const cookieName = env.GUEST_SESSION_COOKIE_NAME;
      const raw = request.cookies?.[cookieName];
      return raw ?? request.ip;
    },
    // @fastify/rate-limit does `throw errorResponseBuilder(...)` internally
    // (confirmed by reading its own source) and expects the return value to
    // carry a real `.statusCode`, exactly like its own default builder
    // returns an Error with `.statusCode` set — returning a plain body
    // object here (this Gateway's original attempt) loses that property,
    // and the thrown value falls through this app's own global error
    // handler's generic-failure branch as an unrelated 500. Returning the
    // GatewayError instance itself (an Error subclass that already carries
    // `.statusCode`) satisfies both: the rate-limit plugin's own
    // requirement, and this Gateway's `toGatewayError()`'s
    // `instanceof GatewayError` fast path, so the exact same 429 body is
    // still what the caller receives either way.
    errorResponseBuilder: (_request, context) => GatewayError.rateLimited(`Too many requests. Please try again in ${context.after}.`),
  });
}
