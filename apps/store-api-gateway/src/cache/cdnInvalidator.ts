/**
 * CdnInvalidator — this slice's own requirement: "future CDN invalidation,
 * future edge caching." No real CDN is fronting this Gateway yet
 * (`STORE_FRONTEND_ARCHITECTURE.md` §4's own item 3 already named this as
 * Phase 2.2+ deployment work, not architecture) — this is the seam a real
 * integration (Cloudflare, a Vercel-fronted deployment, etc.) implements
 * later. The no-op default logs its own intent so a developer running
 * locally can SEE cache-group purges happening even before any real CDN
 * exists to receive them — never a silent no-op.
 */
import type { FastifyBaseLogger } from 'fastify';

export interface CdnInvalidator {
  invalidateTags(tags: string[]): Promise<void>;
}

export function createNoopCdnInvalidator(logger: FastifyBaseLogger): CdnInvalidator {
  return {
    invalidateTags(tags: string[]): Promise<void> {
      logger.info({ tags }, 'CDN invalidation requested — no CDN is configured for this environment (no-op)');
      return Promise.resolve();
    },
  };
}
