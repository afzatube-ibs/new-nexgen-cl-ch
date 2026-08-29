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
  | 'unauthenticated'
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

  /**
   * Production Completion Plan v2, Milestone 5 (Customer Accounts) — the
   * first Gateway credential path (Category C, `CustomerBackendClient`)
   * where a 401 from the real backend is an expected, routine outcome
   * (the shopper isn't logged in, or their token expired/was revoked),
   * never a Gateway misconfiguration. Every Category A/B call before this
   * milestone used the Gateway's own always-valid fixed service
   * credential, so a 401 there would have meant something was genuinely
   * broken — correctly generic `upstream_error`/`upstream_unavailable`.
   * This is deliberately its own code, not reused from `not_found` or
   * `validation_failed`, so a Storefront caller can react to it
   * specifically (e.g. redirect to `/login`) rather than pattern-match a
   * message string.
   */
  static unauthenticated(message = 'You must be signed in to do that.'): GatewayError {
    return new GatewayError(401, 'unauthenticated', message);
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
 * The real backend's own ONE, single, platform-wide error envelope for
 * every exception it ever renders (`bootstrap/app.php`'s own `$envelope`
 * closure, confirmed by direct source read — not inferred from response
 * shapes alone, which is exactly how this function's own two prior,
 * INCORRECT docblocks each got this wrong): `{"error": {"type",
 * "message", "details"?}}`. `details` — present only for a real
 * `ValidationException` — is Laravel's own `$e->errors()`: a field-keyed
 * map of one-or-more messages per field (`{"email": ["..."]}`), never a
 * top-level `errors` key with no `error` wrapper (Laravel's own
 * out-of-the-box default shape, which this backend's own global handler
 * always reshapes before it ever reaches a caller).
 *
 * **Real, live-found correction to this function's own prior claims**:
 * both a previous version of this docblock (which assumed a bare
 * `{"errors": {...}}` with no wrapper) and the one before that (which
 * additionally assumed Payments' own domain exceptions used a
 * genuinely different second shape) were wrong — confirmed live via
 * `POST /customers/login` with a wrong password returning exactly
 * `{"error":{"type":"validation_failed","message":"The given data was
 * invalid.","details":{"email":["The provided credentials are
 * incorrect."]}}}`, and by reading `bootstrap/app.php`'s own `$envelope`
 * closure directly: `details` is simply omitted (via `array_filter`)
 * when an exception carries none — Payments' own domain exceptions were
 * never a different shape, only this one shape's own optional field
 * being absent.
 */
export function extractBackendValidationDetails(body: unknown): Array<{ field: string; message: string }> | null {
  if (typeof body !== 'string' || body.length === 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || !('error' in parsed)) return null;
  const { error } = parsed;
  if (typeof error !== 'object' || error === null || !('details' in error)) return null;
  const { details } = error as { details: unknown };
  if (typeof details !== 'object' || details === null) return null;

  const result: Array<{ field: string; message: string }> = [];
  for (const [field, messages] of Object.entries(details)) {
    const first: unknown = Array.isArray(messages) ? (messages as unknown[])[0] : messages;
    if (typeof first === 'string') result.push({ field, message: first });
  }
  return result.length > 0 ? result : null;
}

/**
 * A single, human-readable message from EITHER real backend error shape
 * this Gateway has actually observed (see `extractBackendValidationDetails`'s
 * own docblock for how these were found to differ): the field-keyed
 * `{"errors": {...}}` Laravel `ValidationException` shape (joined into one
 * string), or the single-message `{"error": {"message": "..."}}` shape a
 * real domain exception (e.g. `PaymentGatewayNotAvailable`) renders
 * through. Returns `null` only if `body` matches neither real shape —
 * callers fall back to their own generic message in that case, never to
 * an empty string.
 */
export function extractBackendErrorMessage(body: unknown): string | null {
  const details = extractBackendValidationDetails(body);
  if (details) return details.map((detail) => detail.message).join(' ');

  if (typeof body !== 'string' || body.length === 0) return null;
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed !== 'object' || parsed === null || !('error' in parsed)) return null;
    const { error } = parsed;
    if (typeof error !== 'object' || error === null || !('message' in error)) return null;
    const { message } = error;
    return typeof message === 'string' && message.length > 0 ? message : null;
  } catch {
    return null;
  }
}

/**
 * Route handlers never inspect BackendUpstreamError directly — they call
 * this once, in a shared catch block, so every route reports upstream
 * failures identically (§7.1's "one error pattern" requirement).
 *
 * `serviceName` lets a Beta Sprint 5 checkout/payments/shipping call site
 * report an accurate dependency name ("checkout"/"payments"/"shipping")
 * instead of the original Catalog-only call sites' implicit "catalog" —
 * every existing call site is unaffected (defaults to 'catalog', the
 * same wording this function always used before this parameter existed).
 */
export function toGatewayError(error: unknown, serviceName = 'catalog'): GatewayError {
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
    if (error.upstreamStatus === 401) return GatewayError.unauthenticated();
    if (error.upstreamStatus === 404) return GatewayError.notFound();
    if (error.upstreamStatus === 422) {
      const details = extractBackendValidationDetails(error.upstreamBody);
      if (details) return GatewayError.validation(details);
    }
    if (error.upstreamStatus === null) {
      return new GatewayError(503, 'upstream_unavailable', `The ${serviceName} service is temporarily unavailable.`);
    }
    return new GatewayError(502, 'upstream_error', `The ${serviceName} service returned an unexpected response.`);
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
