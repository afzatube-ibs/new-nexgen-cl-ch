/**
 * Guest Session pipeline stage — resolves/mints the visitor's Device
 * Identity (context/guestSession.ts) on every request and decorates it
 * onto `request.guestIdentity` for downstream handlers/observability.
 * Deliberately cheap (an HMAC verify, no network/database call) so it can
 * run on every request, including one the Cache stage (lib/cacheHelper.ts)
 * is about to short-circuit — a visitor still needs their identity cookie
 * set on a cache-hit response, per CDP_ARCHITECTURE.md §3.2's "durable,
 * refreshed on visit" cookie lifetime.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Env } from '../config/env.js';
import { resolveGuestIdentity, type GuestIdentity } from '../context/guestSession.js';

declare module 'fastify' {
  interface FastifyRequest {
    guestIdentity: GuestIdentity;
  }
}

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function registerGuestSessionHook(app: FastifyInstance, env: Env): void {
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const cookieName = env.GUEST_SESSION_COOKIE_NAME;
    const existing = request.cookies?.[cookieName];
    const resolved = resolveGuestIdentity(existing, env.GUEST_SESSION_SECRET);

    request.guestIdentity = { deviceId: resolved.deviceId, isNew: resolved.isNew };

    if (resolved.isNew && resolved.token) {
      // First-party, server-set only — CDP_ARCHITECTURE.md §3.2's own
      // rule. HttpOnly since no route in this slice needs client-JS to
      // read it; a future storefront-side analytics need would be an
      // explicit, separately-justified exception, never the default.
      reply.setCookie(cookieName, resolved.token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: ONE_YEAR_SECONDS,
      });
    }

    request.log.debug({ deviceId: request.guestIdentity.deviceId, isNew: request.guestIdentity.isNew }, 'Guest identity resolved');
  });
}
