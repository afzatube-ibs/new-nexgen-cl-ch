/**
 * Personalization plugin boundary — builds one `PersonalizationContext`
 * per request and decorates it onto `request.personalization`. Depends on
 * Guest Session (`plugins/context.ts`) already having run — registered
 * after it in `server.ts`'s own pipeline order, per this module's own
 * onRequest hook needing `request.guestIdentity` to already be resolved.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Env } from '../config/env.js';
import { buildPersonalizationContext, type PersonalizationContext } from '../personalization/context.js';
import { extractUtmParameters } from '../personalization/attribution.js';
import { classifyDevice } from '../personalization/device.js';
import { resolveStoreContext } from '../context/localization.js';

declare module 'fastify' {
  interface FastifyRequest {
    personalization: PersonalizationContext;
  }
}

export function registerPersonalizationPlugin(app: FastifyInstance, env: Env): void {
  app.addHook('onRequest', async (request: FastifyRequest, _reply: FastifyReply) => {
    const query = request.query as Record<string, string | string[] | undefined>;
    const store = resolveStoreContext(env, {
      hostHeader: request.headers.host,
      queryLocale: typeof query['locale'] === 'string' ? query['locale'] : undefined,
      queryCurrency: typeof query['currency'] === 'string' ? query['currency'] : undefined,
      acceptLanguageHeader: request.headers['accept-language'],
    });

    request.personalization = buildPersonalizationContext({
      guestIdentity: request.guestIdentity,
      store,
      attribution: extractUtmParameters(query),
      referrer: request.headers.referer ?? null,
      device: classifyDevice(request.headers['user-agent']),
    });
  });
}
