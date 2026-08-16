import { describe, expect, it } from 'vitest';
import { formatWeightGrams, formatWeightBand } from './formatWeight.js';

describe('formatWeightGrams', () => {
  it('shows grams for sub-kilogram weights', () => {
    expect(formatWeightGrams(500)).toBe('500 g');
    expect(formatWeightGrams(0)).toBe('0 g');
  });

  it('shows a whole-number kg for exact multiples of 1000', () => {
    expect(formatWeightGrams(1000)).toBe('1 kg');
    expect(formatWeightGrams(5000)).toBe('5 kg');
  });

  it('shows two decimal places for a non-exact kg value', () => {
    expect(formatWeightGrams(1500)).toBe('1.50 kg');
  });

  it('returns an em dash for null', () => {
    expect(formatWeightGrams(null)).toBe('—');
  });
});

describe('formatWeightBand', () => {
  it('formats a bounded band as min–max', () => {
    expect(formatWeightBand(0, 500)).toBe('0 g–500 g');
  });

  it('formats an unbounded band (max: null, ShippingRate::coversWeight()\'s own semantics) with a trailing +', () => {
    expect(formatWeightBand(1000, null)).toBe('1 kg+');
  });
});
