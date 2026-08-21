import { describe, expect, it } from 'vitest';
import { formatPercent } from './formatPercent.js';

describe('formatPercent', () => {
  it('drops trailing zeros', () => {
    expect(formatPercent('8.5000')).toBe('8.5%');
  });

  it('preserves real precision beyond 2 decimal places', () => {
    expect(formatPercent('8.5678')).toBe('8.5678%');
  });

  it('formats a whole number cleanly', () => {
    expect(formatPercent('10.0000')).toBe('10%');
  });

  it('formats zero', () => {
    expect(formatPercent('0.0000')).toBe('0%');
  });

  it('falls back to the raw string for a malformed value', () => {
    expect(formatPercent('not-a-number')).toBe('not-a-number');
  });
});
