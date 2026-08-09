import { describe, expect, it } from 'vitest';
import {
  mapErrorResponse,
  UnauthenticatedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationApiError,
  RateLimitedError,
  ApiError,
} from './errors.js';

describe('mapErrorResponse', () => {
  it('maps 401 to UnauthenticatedError', () => {
    const err = mapErrorResponse(401, { type: 'unauthenticated', message: 'Authentication is required.' }, null);
    expect(err).toBeInstanceOf(UnauthenticatedError);
    expect(err.status).toBe(401);
  });

  it('maps 403 to ForbiddenError', () => {
    const err = mapErrorResponse(403, { type: 'authorization_denied', message: 'Denied.' }, null);
    expect(err).toBeInstanceOf(ForbiddenError);
  });

  it('maps 404 to NotFoundError', () => {
    const err = mapErrorResponse(404, { type: 'not_found', message: 'Not found.' }, null);
    expect(err).toBeInstanceOf(NotFoundError);
  });

  it('maps 409 to ConflictError', () => {
    const err = mapErrorResponse(409, { type: 'conflict', message: 'Conflict.' }, null);
    expect(err).toBeInstanceOf(ConflictError);
  });

  it('maps 422 to ValidationApiError with fieldErrors from details', () => {
    const err = mapErrorResponse(
      422,
      { type: 'validation_failed', message: 'Invalid.', details: { email: ['The email field is required.'] } },
      null,
    );
    expect(err).toBeInstanceOf(ValidationApiError);
    expect((err as ValidationApiError).fieldErrors.email?.[0]).toBe('The email field is required.');
  });

  it('maps 429 to RateLimitedError, reading Retry-After', () => {
    const err = mapErrorResponse(429, { type: 'rate_limited', message: 'Too many requests.' }, '30');
    expect(err).toBeInstanceOf(RateLimitedError);
    expect((err as RateLimitedError).retryAfterSeconds).toBe(30);
  });

  it('falls back to the generic ApiError for an unmapped status', () => {
    const err = mapErrorResponse(500, { type: 'http_error', message: 'Server error.' }, null);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(UnauthenticatedError);
  });
});
