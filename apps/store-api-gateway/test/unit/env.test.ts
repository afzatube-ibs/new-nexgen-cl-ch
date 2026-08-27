import { describe, expect, it } from 'vitest';
import { loadEnv, resetEnvCacheForTests } from '../../src/config/env.js';

const validEnv = {
  BACKEND_BASE_URL: 'http://127.0.0.1:8080/api/v1',
  BACKEND_SERVICE_TOKEN: 'test-token',
  BACKEND_CHECKOUT_SERVICE_TOKEN: 'test-checkout-token',
  GUEST_SESSION_SECRET: 'a'.repeat(32),
  PREVIEW_TOKEN_SECRET: 'b'.repeat(32),
};

describe('config/env', () => {
  it('applies defaults for every optional value', () => {
    resetEnvCacheForTests();
    const env = loadEnv(validEnv);
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.DEFAULT_LOCALE).toBe('en');
    expect(env.SUPPORTED_LOCALES).toEqual(['en']);
    expect(env.DEFAULT_CURRENCY).toBe('USD');
    expect(env.PREVIEW_TOKEN_TTL_SECONDS).toBe(3600);
    expect(env.PUBLIC_BASE_URL).toBe('http://127.0.0.1:4000');
  });

  it('rejects a missing BACKEND_SERVICE_TOKEN with a specific, actionable error', () => {
    resetEnvCacheForTests();
    expect(() =>
      loadEnv({
        BACKEND_BASE_URL: validEnv.BACKEND_BASE_URL,
        BACKEND_CHECKOUT_SERVICE_TOKEN: validEnv.BACKEND_CHECKOUT_SERVICE_TOKEN,
        GUEST_SESSION_SECRET: validEnv.GUEST_SESSION_SECRET,
        PREVIEW_TOKEN_SECRET: validEnv.PREVIEW_TOKEN_SECRET,
      }),
    ).toThrow(/BACKEND_SERVICE_TOKEN/);
  });

  it('rejects a missing BACKEND_CHECKOUT_SERVICE_TOKEN with a specific, actionable error', () => {
    resetEnvCacheForTests();
    expect(() =>
      loadEnv({
        BACKEND_BASE_URL: validEnv.BACKEND_BASE_URL,
        BACKEND_SERVICE_TOKEN: validEnv.BACKEND_SERVICE_TOKEN,
        GUEST_SESSION_SECRET: validEnv.GUEST_SESSION_SECRET,
        PREVIEW_TOKEN_SECRET: validEnv.PREVIEW_TOKEN_SECRET,
      }),
    ).toThrow(/BACKEND_CHECKOUT_SERVICE_TOKEN/);
  });

  it('rejects a GUEST_SESSION_SECRET shorter than 32 characters', () => {
    resetEnvCacheForTests();
    expect(() => loadEnv({ ...validEnv, GUEST_SESSION_SECRET: 'too-short' })).toThrow(/GUEST_SESSION_SECRET/);
  });

  it('rejects a PREVIEW_TOKEN_SECRET shorter than 32 characters', () => {
    resetEnvCacheForTests();
    expect(() => loadEnv({ ...validEnv, PREVIEW_TOKEN_SECRET: 'too-short' })).toThrow(/PREVIEW_TOKEN_SECRET/);
  });

  it('rejects a malformed BACKEND_BASE_URL', () => {
    resetEnvCacheForTests();
    expect(() => loadEnv({ ...validEnv, BACKEND_BASE_URL: 'not-a-url' })).toThrow();
  });

  it('parses comma-separated CORS_ALLOWED_ORIGINS into a trimmed array', () => {
    resetEnvCacheForTests();
    const env = loadEnv({ ...validEnv, CORS_ALLOWED_ORIGINS: 'http://a.com, http://b.com ,http://c.com' });
    expect(env.CORS_ALLOWED_ORIGINS).toEqual(['http://a.com', 'http://b.com', 'http://c.com']);
  });

  it('leaves event-destination credentials undefined by default (every destination starts unavailable)', () => {
    resetEnvCacheForTests();
    const env = loadEnv(validEnv);
    expect(env.META_CAPI_ACCESS_TOKEN).toBeUndefined();
    expect(env.GA4_API_SECRET).toBeUndefined();
    expect(env.TIKTOK_EVENTS_ACCESS_TOKEN).toBeUndefined();
    expect(env.EVENTS_WEBHOOK_URL).toBeUndefined();
  });

  it('treats an empty string for an optional destination-credential field as unset, not invalid (real .env files represent "unset" as a blank value, e.g. "EVENTS_WEBHOOK_URL=")', () => {
    resetEnvCacheForTests();
    const env = loadEnv({ ...validEnv, EVENTS_WEBHOOK_URL: '', META_CAPI_ACCESS_TOKEN: '', GA4_API_SECRET: '', TIKTOK_EVENTS_ACCESS_TOKEN: '' });
    expect(env.EVENTS_WEBHOOK_URL).toBeUndefined();
    expect(env.META_CAPI_ACCESS_TOKEN).toBeUndefined();
    expect(env.GA4_API_SECRET).toBeUndefined();
    expect(env.TIKTOK_EVENTS_ACCESS_TOKEN).toBeUndefined();
  });

  it('caches the parsed result across calls until reset', () => {
    resetEnvCacheForTests();
    const first = loadEnv(validEnv);
    const second = loadEnv({ ...validEnv, PORT: '9999' });
    expect(second.PORT).toBe(first.PORT);
  });
});
