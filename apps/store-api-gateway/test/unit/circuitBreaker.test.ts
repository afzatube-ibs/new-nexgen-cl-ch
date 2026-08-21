import { describe, expect, it, vi } from 'vitest';
import { CircuitBreaker } from '../../src/lib/circuitBreaker.js';

describe('lib/circuitBreaker', () => {
  it('starts closed and allows requests', () => {
    const breaker = new CircuitBreaker('catalog', { failureThreshold: 3, resetTimeoutMs: 1000 });
    expect(breaker.canProceed()).toBe(true);
    expect(breaker.getState()).toBe('closed');
  });

  it('trips open after reaching the failure threshold', () => {
    const breaker = new CircuitBreaker('catalog', { failureThreshold: 3, resetTimeoutMs: 1000 });
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.canProceed()).toBe(true); // still under threshold
    breaker.recordFailure();
    expect(breaker.canProceed()).toBe(false);
    expect(breaker.getState()).toBe('open');
  });

  it('resets the failure count on a success before the threshold is reached', () => {
    const breaker = new CircuitBreaker('search', { failureThreshold: 3, resetTimeoutMs: 1000 });
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordSuccess();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.canProceed()).toBe(true); // only 2 consecutive since the reset
  });

  it('transitions open -> half-open after resetTimeoutMs elapses, isolated per-instance (never a shared/global breaker)', () => {
    vi.useFakeTimers();
    const catalogBreaker = new CircuitBreaker('catalog', { failureThreshold: 1, resetTimeoutMs: 5000 });
    const searchBreaker = new CircuitBreaker('search', { failureThreshold: 1, resetTimeoutMs: 5000 });

    catalogBreaker.recordFailure();
    expect(catalogBreaker.getState()).toBe('open');
    expect(searchBreaker.getState()).toBe('closed'); // a struggling Catalog module never degrades Search's own circuit — STORE_API_GATEWAY_ARCHITECTURE.md §3.2

    vi.advanceTimersByTime(5001);
    expect(catalogBreaker.getState()).toBe('half-open');
    expect(catalogBreaker.canProceed()).toBe(true);

    vi.useRealTimers();
  });
});
