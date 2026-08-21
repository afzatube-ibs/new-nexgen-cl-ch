/**
 * Preview plugin boundary — decorates `app.preview` with mint/verify
 * helpers bound to this process's own configured secret/TTL/base URL. No
 * route reaches into `preview/token.ts` directly; every route goes
 * through `app.preview`.
 */
import type { FastifyInstance } from 'fastify';
import type { Env } from '../config/env.js';
import { mintPreviewToken, verifyPreviewToken, type VerifyPreviewResult } from '../preview/token.js';
import type { MintedPreview, PreviewKind } from '../preview/types.js';

export interface PreviewService {
  mint(kind: PreviewKind, targetId: string): MintedPreview;
  verify(token: string): VerifyPreviewResult;
}

declare module 'fastify' {
  interface FastifyInstance {
    preview: PreviewService;
  }
}

export function registerPreviewPlugin(app: FastifyInstance, env: Env): void {
  const service: PreviewService = {
    mint: (kind, targetId) =>
      mintPreviewToken({ kind, targetId, ttlSeconds: env.PREVIEW_TOKEN_TTL_SECONDS, secret: env.PREVIEW_TOKEN_SECRET, baseUrl: env.PUBLIC_BASE_URL }),
    verify: (token) => verifyPreviewToken(token, env.PREVIEW_TOKEN_SECRET),
  };
  app.decorate('preview', service);
}
