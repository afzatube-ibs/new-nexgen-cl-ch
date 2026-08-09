/**
 * Typed error hierarchy mirroring apps/backend's real error envelope
 * (bootstrap/app.php's `$envelope()` — API:ERROR_MODEL / API:RESPONSE_ENVELOPE):
 *
 *   { "error": { "type": "...", "message": "...", "details"?: ... } }
 *
 * One subclass per `type`/status pairing the backend actually emits, so
 * calling code can `instanceof`-branch instead of string-comparing a raw
 * status code. `ApiError` is the catch-all for a shape the backend hasn't
 * defined a dedicated mapping for yet.
 */

export interface ApiErrorBody {
  type: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly type: string;
  readonly details: unknown;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.type = body.type;
    this.details = body.details;
  }
}

/** 401 — `unauthenticated`. Token missing, invalid, or expired/revoked. */
export class UnauthenticatedError extends ApiError {
  constructor(body: ApiErrorBody) {
    super(401, body);
    this.name = 'UnauthenticatedError';
  }
}

/** 403 — `authorization_denied`. Authenticated, but lacks the required permission. */
export class ForbiddenError extends ApiError {
  constructor(body: ApiErrorBody) {
    super(403, body);
    this.name = 'ForbiddenError';
  }
}

/** 404 — `not_found`. */
export class NotFoundError extends ApiError {
  constructor(body: ApiErrorBody) {
    super(404, body);
    this.name = 'NotFoundError';
  }
}

/** 409 — `conflict`. Optimistic-locking conflict or a restrict-on-delete guard. */
export class ConflictError extends ApiError {
  constructor(body: ApiErrorBody) {
    super(409, body);
    this.name = 'ConflictError';
  }
}

/**
 * 422 — `validation_failed`. `details` is Laravel's field-keyed error map
 * (`{ [field: string]: string[] }`), per `ValidationException::errors()`.
 */
export class ValidationApiError extends ApiError {
  readonly fieldErrors: Record<string, string[]>;

  constructor(body: ApiErrorBody) {
    super(422, body);
    this.name = 'ValidationApiError';
    this.fieldErrors = (body.details as Record<string, string[]>) ?? {};
  }
}

/** 429 — `rate_limited`. `retryAfterSeconds` is read from the `Retry-After` response header. */
export class RateLimitedError extends ApiError {
  readonly retryAfterSeconds: number | null;

  constructor(body: ApiErrorBody, retryAfterSeconds: number | null) {
    super(429, body);
    this.name = 'RateLimitedError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** The response body was not JSON, or was JSON that didn't match the expected envelope — a client/network-level failure, not a mapped backend error. */
export class NetworkOrParseError extends Error {
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'NetworkOrParseError';
    this.cause = cause;
  }
}

export function mapErrorResponse(status: number, body: ApiErrorBody, retryAfterHeader: string | null): ApiError {
  switch (status) {
    case 401:
      return new UnauthenticatedError(body);
    case 403:
      return new ForbiddenError(body);
    case 404:
      return new NotFoundError(body);
    case 409:
      return new ConflictError(body);
    case 422:
      return new ValidationApiError(body);
    case 429:
      return new RateLimitedError(body, retryAfterHeader ? Number(retryAfterHeader) : null);
    default:
      return new ApiError(status, body);
  }
}
