/**
 * The Gateway's own error model — the same structural shape API:ERROR_MODEL
 * and API:RESPONSE_ENVELOPE already establish, platform-wide, for the real
 * backend (per STORE_API_GATEWAY_ARCHITECTURE.md §7.1: "a backend error is
 * never re-shaped into a different envelope by the Gateway... Gateway-
 * specific errors... use the identical envelope shape for consistency").
 * A Theme Package or future mobile client learns one error pattern
 * regardless of whether it is talking to the Gateway or, conceptually, the
 * backend it proxies.
 */
import { ZodError } from 'zod';

export type GatewayErrorCode =
  | 'validation_failed'
  | 'not_found'
  | 'rate_limited'
  | 'circuit_open'
  | 'upstream_error'
  | 'upstream_unavailable'
  | 'internal_error';

export interface GatewayErrorBody {
  error: {
    code: GatewayErrorCode;
    message: string;
    /** Present only for validation_failed — which field, and why. */
    details?: Array<{ field: string; message: string }>;
  };
  meta: {
    requestId: string;
  };
}

/**
 * A typed, structured failure this Gateway itself raises (as opposed to an
 * error proxied through unchanged from the real backend, per
 * BackendUpstreamError below). Every GatewayError carries the HTTP status
 * it should be reported as, so a route handler never has to re-derive it.
 */
export class GatewayError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: GatewayErrorCode,
    message: string,
    public readonly details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'GatewayError';
  }

  static notFound(message = 'The requested resource was not found.'): GatewayError {
    return new GatewayError(404, 'not_found', message);
  }

  static validation(details: Array<{ field: string; message: string }>): GatewayError {
    return new GatewayError(422, 'validation_failed', 'One or more fields failed validation.', details);
  }

  static rateLimited(message = 'Too many requests. Please try again shortly.'): GatewayError {
    return new GatewayError(429, 'rate_limited', message);
  }

  static circuitOpen(dependency: string): GatewayError {
    return new GatewayError(
      503,
      'circuit_open',
      `The ${dependency} service is temporarily unavailable. Please try again shortly.`,
    );
  }

  toBody(requestId: string): GatewayErrorBody {
    return {
      error: { code: this.code, message: this.message, details: this.details },
      meta: { requestId },
    };
  }
}

/**
 * Wraps a failure that originated in the real backend (a non-2xx response,
 * or a network-level failure calling it) — distinguished from GatewayError
 * so logging/observability (STORE_API_GATEWAY_ARCHITECTURE.md §7.2) can
 * tell "the Gateway itself rejected this" apart from "the backend rejected
 * this," which matters for diagnosing where a problem actually lives.
 */
export class BackendUpstreamError extends Error {
  constructor(
    public readonly upstreamStatus: number | null,
    message: string,
    public readonly upstreamBody?: unknown,
  ) {
    super(message);
    this.name = 'BackendUpstreamError';
  }
}

/**
 * Route handlers never inspect BackendUpstreamError directly — they call
 * this once, in a shared catch block, so every route reports upstream
 * failures identically (§7.1's "one error pattern" requirement).
 */
export function toGatewayError(error: unknown): GatewayError {
  if (error instanceof GatewayError) return error;
  if (error instanceof ZodError) {
    // Route handlers validate params/query with a direct Zod `.parse()`
    // call (not Fastify's own AJV-based schema validation, which
    // `server.ts`'s error handler already handles via `error.validation`)
    // — a rejected UUID param or an out-of-range query value surfaces here
    // as a ZodError and must be normalized to the same 422 shape, never
    // fall through to a generic 500.
    return GatewayError.validation(error.issues.map((issue) => ({ field: issue.path.join('.') || 'unknown', message: issue.message })));
  }
  if (error instanceof BackendUpstreamError) {
    if (error.message.startsWith('circuit_open:')) {
      return GatewayError.circuitOpen(error.message.split(':')[1] ?? 'backend');
    }
    if (error.upstreamStatus === 404) return GatewayError.notFound();
    if (error.upstreamStatus === null) {
      return new GatewayError(503, 'upstream_unavailable', 'The catalog service is temporarily unavailable.');
    }
    return new GatewayError(502, 'upstream_error', 'The catalog service returned an unexpected response.');
  }
  // A plugin-thrown error (e.g. @fastify/rate-limit's own error, which
  // already carries a real statusCode of 429 and a body already shaped by
  // this Gateway's own `errorResponseBuilder` — see plugins/security.ts)
  // reaching this generic fallback still deserves its own real status,
  // never a blanket 500 that would misrepresent a client-side condition
  // (rate-limited) as a server fault. Checked defensively — `error` here
  // is `unknown` by this function's own contract.
  if (isObjectWithNumericStatusCode(error)) {
    const statusCode = error.statusCode;
    const rawMessage = (error as { message?: unknown }).message;
    const message = typeof rawMessage === 'string' ? rawMessage : 'Request could not be completed.';
    if (statusCode === 429) return GatewayError.rateLimited(message);
    if (statusCode >= 400 && statusCode < 500) return new GatewayError(statusCode, 'validation_failed', message);
  }
  return new GatewayError(500, 'internal_error', 'An unexpected error occurred.');
}

function isObjectWithNumericStatusCode(error: unknown): error is { statusCode: number } {
  return typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number';
}
