import { describe, expect, it } from 'vitest';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE, resolveStoreContext } from '../src/context/storeContext.js';

describe('context/storeContext', () => {
  it('applies real defaults when no override is present', () => {
    const ctx = resolveStoreContext({ requestId: 'req-1' });
    expect(ctx.locale).toBe(DEFAULT_LOCALE);
    expect(ctx.currency).toBe(DEFAULT_CURRENCY);
    expect(ctx.store).toBe('default');
    expect(ctx.theme).toBeNull();
  });

  it('honors a supported ?locale= override', () => {
    const ctx = resolveStoreContext({ requestId: 'req-1', localeParam: 'en' });
    expect(ctx.locale).toBe('en');
  });

  it('rejects an unsupported locale, falling back to the default rather than passing through an unvalidated value', () => {
    const ctx = resolveStoreContext({ requestId: 'req-1', localeParam: 'zz' });
    expect(ctx.locale).toBe(DEFAULT_LOCALE);
  });

  it('honors a well-formed ?currency= override', () => {
    const ctx = resolveStoreContext({ requestId: 'req-1', currencyParam: 'BDT' });
    expect(ctx.currency).toBe('BDT');
  });

  it('rejects a malformed currency code, falling back to the default', () => {
    const ctx = resolveStoreContext({ requestId: 'req-1', currencyParam: 'nope' });
    expect(ctx.currency).toBe(DEFAULT_CURRENCY);
  });

  it('extracts real UTM parameters from the search params', () => {
    const searchParams = new URLSearchParams('utm_source=google&utm_medium=cpc&utm_campaign=summer');
    const ctx = resolveStoreContext({ requestId: 'req-1', searchParams });
    expect(ctx.personalization.utm).toEqual({ source: 'google', medium: 'cpc', campaign: 'summer' });
  });

  it('leaves UTM fields null when absent, never fabricated', () => {
    const ctx = resolveStoreContext({ requestId: 'req-1' });
    expect(ctx.personalization.utm).toEqual({ source: null, medium: null, campaign: null });
  });

  it('classifies device type from a real User-Agent string', () => {
    expect(resolveStoreContext({ requestId: 'r', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' }).personalization.device).toBe('mobile');
    expect(resolveStoreContext({ requestId: 'r', userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0)' }).personalization.device).toBe('tablet');
    expect(resolveStoreContext({ requestId: 'r', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }).personalization.device).toBe('desktop');
    expect(resolveStoreContext({ requestId: 'r' }).personalization.device).toBe('unknown');
  });

  it('feature flags are real-shaped but honestly empty — no public Gateway flag-evaluation route exists yet', () => {
    const ctx = resolveStoreContext({ requestId: 'req-1' });
    expect(ctx.featureFlags).toEqual({});
  });

  it('threads the caller-supplied requestId through unchanged', () => {
    const ctx = resolveStoreContext({ requestId: 'req-abc-123' });
    expect(ctx.requestContext.requestId).toBe('req-abc-123');
  });
});
