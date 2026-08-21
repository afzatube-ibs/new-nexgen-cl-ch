/**
 * Public API Versioning — STORE_API_GATEWAY_ARCHITECTURE.md §5.1's own
 * already-designed rule: "the Gateway's own `/api/storefront/*` contract
 * is versioned independently of the backend's own... REST versioning."
 * This slice formalizes that as a real registration helper rather than a
 * bare `/v1` prefix hardcoded per route file (Slice 1's own approach) —
 * every route now declares its version explicitly, so a future v2 is a
 * second `registerVersionedRoutes(app, 'v2', ...)` call, never a rewrite
 * of v1's own files.
 */
import type { FastifyInstance } from 'fastify';

export const CURRENT_VERSION = 'v1';
export const SUPPORTED_VERSIONS = ['v1'] as const;
export type ApiVersion = (typeof SUPPORTED_VERSIONS)[number];

export interface VersionInfo {
  version: ApiVersion;
  /** Set on a version once a successor exists — the concrete trigger for API:DEPRECATION's "minimum notice window" policy this Gateway inherits from the real backend's own already-Accepted rule. Null today: v1 is the only, current version. */
  deprecatedAt: string | null;
  sunsetAt: string | null;
}

const versionInfo: Record<ApiVersion, VersionInfo> = {
  v1: { version: 'v1', deprecatedAt: null, sunsetAt: null },
};

export function getVersionInfo(version: ApiVersion): VersionInfo {
  return versionInfo[version];
}

/**
 * Registers a set of routes under `/{version}/...`, and — once a version
 * is marked deprecated in `versionInfo` above — automatically attaches
 * `Deprecation`/`Sunset` response headers (the real, standard HTTP headers
 * for this, RFC 8594/draft-ietf-httpapi-deprecation-header) to every
 * response that version serves, without any individual route needing to
 * know its own version's deprecation state.
 */
export function registerVersionedRoutes(app: FastifyInstance, version: ApiVersion, register: (app: FastifyInstance, prefix: string) => void): void {
  const info = getVersionInfo(version);
  const prefix = `/${version}`;

  // NOTE: prefixing happens exactly once, via the string `register(...,
  // prefix)` passed to the callback below (every route file builds its own
  // full path as `${prefix}/whatever`) — deliberately NOT also passed as
  // Fastify's own `{ prefix }` plugin-registration option, which would
  // double-apply it (`/v1/v1/categories`). The onRequest hook below still
  // needs a real encapsulation boundary to attach the deprecation headers
  // to only this version's own routes, so it registers as a plain,
  // unprefixed plugin context instead.
  app.register((versionedApp, _opts, done) => {
    versionedApp.addHook('onRequest', (_request, reply, hookDone) => {
      if (info.deprecatedAt) {
        reply.header('Deprecation', info.deprecatedAt);
        if (info.sunsetAt) reply.header('Sunset', info.sunsetAt);
      }
      hookDone();
    });
    register(versionedApp, prefix);
    done();
  });
}
