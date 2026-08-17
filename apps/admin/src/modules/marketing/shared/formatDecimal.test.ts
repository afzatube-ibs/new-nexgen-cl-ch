import { describe, expect, it } from 'vitest';
import { formatDecimal } from './formatDecimal.js';

describe('formatDecimal', () => {
  it('trims trailing zeros from a fixed-precision decimal-cast string', () => {
    expect(formatDecimal('10.0000')).toBe('10');
    expect(formatDecimal('50.0000')).toBe('50');
  });

  it('keeps significant fractional digits', () => {
    expect(formatDecimal('12.5000')).toBe('12.5');
    expect(formatDecimal('12.3400')).toBe('12.34');
  });

  it('leaves integer-looking strings with no decimal point untouched', () => {
    expect(formatDecimal('10')).toBe('10');
  });
});
