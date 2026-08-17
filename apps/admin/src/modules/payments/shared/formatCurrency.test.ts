import { describe, expect, it } from 'vitest';
import { formatCurrency } from './formatCurrency.js';

describe('formatCurrency', () => {
  it('formats a decimal string using the given currency', () => {
    expect(formatCurrency('49.9900', 'USD')).toBe('$49.99');
  });

  it('formats a different currency with its own symbol', () => {
    expect(formatCurrency('49.99', 'EUR')).toMatch(/€/);
  });

  it('falls back to the raw value for a non-numeric string rather than crashing', () => {
    expect(formatCurrency('not-a-number', 'USD')).toBe('not-a-number');
  });

  it('does not crash for a well-formed but unrecognized currency code — Intl.NumberFormat renders it using the code itself, not an error', () => {
    expect(formatCurrency('10.00', 'ZZZ')).toContain('10.00');
  });
});
