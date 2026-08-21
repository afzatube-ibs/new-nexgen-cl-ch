/**
 * Preview Framework routes — this slice's own requirement: "CMS Preview,
 * Theme Preview, Landing Preview, Draft Preview, Shareable Preview URLs,
 * future secure preview tokens." `POST /preview/mint` and
 * `GET /preview/resolve` are the entire, real, functional framework —
 * usable today even with no CMS/Theme/Landing surface yet to call it
 * (this slice's own explicit scope boundary), because minting/verifying a
 * signed token has no dependency on what is eventually being previewed.
 */
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { GatewayError } from '../lib/errors.js';

const mintBodySchema = z.object({
  kind: z.enum(['cms', 'theme', 'landing', 'draft']),
  targetId: z.string().min(1).max(255),
});

export function registerPreviewRoutes(app: FastifyInstance, prefix: string): void {
  app.post(`${prefix}/preview/mint`, (request) => {
    const body = mintBodySchema.parse(request.body);
    const minted = app.preview.mint(body.kind, body.targetId);
    return { data: minted, meta: { requestId: request.id } };
  });

  app.get(`${prefix}/preview/resolve`, (request) => {
    const query = z.object({ token: z.string().min(1) }).parse(request.query);
    const result = app.preview.verify(query.token);
    if (!result.valid) {
      throw new GatewayError(410, 'not_found', `This preview link is no longer valid (${result.reason}).`);
    }
    return { data: result.context, meta: { requestId: request.id } };
  });
}
