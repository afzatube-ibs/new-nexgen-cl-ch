import { describe, expect, it } from 'vitest';
import { slugify } from './slug.js';

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('strips accents/diacritics', () => {
    expect(slugify('Café Déluxe')).toBe('cafe-deluxe');
  });

  it('collapses punctuation and repeated separators into single hyphens', () => {
    expect(slugify("Men's Shoes — Size 10!!")).toBe('men-s-shoes-size-10');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugify('  --Widget--  ')).toBe('widget');
  });

  it('truncates to 255 characters', () => {
    const long = 'a'.repeat(300);
    expect(slugify(long)).toHaveLength(255);
  });

  it('returns an empty string for empty input', () => {
    expect(slugify('')).toBe('');
  });
});
