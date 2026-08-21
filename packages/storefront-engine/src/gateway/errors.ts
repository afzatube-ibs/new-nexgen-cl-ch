import type { GatewayErrorBody } from './types.js';

/** A structured error surfaced by the real Gateway (`API:ERROR_MODEL` shape) — never a raw fetch failure passed through unshaped, per `STORE_API_GATEWAY_ARCHITECTURE.md` §7.1's own "one error envelope, always." */
export class GatewayRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | undefined;

  constructor(status: number, body: GatewayErrorBody | undefined) {
    super(body?.error.message ?? `Gateway request failed with status ${status}`);
    this.name = 'GatewayRequestError';
    this.status = status;
    this.code = body?.error.code ?? 'unknown_error';
    this.requestId = body?.meta.requestId;
  }

  /** True for a 404 from the Gateway — the one status every page-level `notFound()` boundary specifically checks for, per Next.js App Router's own convention. */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /**
   * True for a 501 from the Gateway's own `assertUuidSupported` seam — a
   * slug-shaped identifier where only a real UUID is supported today
   * (`GATEWAY_SLUG_READINESS.md`). Real UX gap found and fixed live
   * (Beta Milestone 1's own browser verification): this app's own internal
   * links only ever produce a real `{id}-{slug}` composite segment
   * (`routing/idSlug.ts`), so the ONLY way a page ever resolves to a
   * slug-shaped identifier is a manually-typed or otherwise malformed URL
   * — indistinguishable, from a visitor's perspective, from a genuinely
   * nonexistent page. Treating this the same as a 404 (rather than
   * surfacing the generic `error.tsx` boundary) is the honest choice for
   * *this app's own routing*, without changing what the Gateway itself
   * correctly reports (a real, more specific 501, still visible to any
   * other consumer of the Gateway's own API).
   */
  get isUnsupportedIdentifier(): boolean {
    return this.status === 501;
  }
}
