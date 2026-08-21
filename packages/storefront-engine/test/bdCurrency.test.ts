import { describe, expect, it } from 'vitest';
import { formatBdt, formatBdtShort } from '../src/components/bdCurrency.js';

describe('components/bdCurrency', () => {
  describe('formatBdt', () => {
    it('formats small amounts with no grouping needed', () => {
      expect(formatBdt(0)).toBe('৳0');
      expect(formatBdt(7)).toBe('৳7');
      expect(formatBdt(999)).toBe('৳999');
    });

    it('applies the lakh/crore grouping convention above 1,000', () => {
      expect(formatBdt(1000)).toBe('৳1,000');
      expect(formatBdt(12345)).toBe('৳12,345');
      expect(formatBdt(123456)).toBe('৳1,23,456');
      expect(formatBdt(1234567)).toBe('৳12,34,567');
      expect(formatBdt(12345678)).toBe('৳1,23,45,678');
    });

    it('rounds fractional amounts to whole Taka by default', () => {
      expect(formatBdt(1234.6)).toBe('৳1,235');
    });

    it('shows two decimals when showDecimals is true', () => {
      expect(formatBdt(1234.5, { showDecimals: true })).toBe('৳1,234.50');
    });

    it('omits the symbol when showSymbol is false', () => {
      expect(formatBdt(1234567, { showSymbol: false })).toBe('12,34,567');
    });

    it('handles negative amounts', () => {
      expect(formatBdt(-1234567)).toBe('-৳12,34,567');
    });
  });

  describe('formatBdtShort', () => {
    it('falls back to formatBdt under 1 lakh', () => {
      expect(formatBdtShort(99999)).toBe('৳99,999');
    });

    it('renders whole lakh amounts without a decimal', () => {
      expect(formatBdtShort(1_500_000)).toBe('15 lakh');
      expect(formatBdtShort(100_000)).toBe('1 lakh');
    });

    it('renders fractional lakh amounts with one decimal', () => {
      expect(formatBdtShort(150_000)).toBe('1.5 lakh');
    });

    it('renders crore amounts', () => {
      expect(formatBdtShort(30_000_000)).toBe('3 crore');
      expect(formatBdtShort(15_000_000)).toBe('1.5 crore');
    });

    it('handles negative short amounts', () => {
      expect(formatBdtShort(-1_500_000)).toBe('-15 lakh');
    });
  });
});
