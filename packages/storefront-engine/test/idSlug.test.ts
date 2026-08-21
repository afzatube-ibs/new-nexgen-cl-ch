import { describe, expect, it } from 'vitest';
import { buildIdSlugSegment, extractIdFromSegment, slugify } from '../src/routing/idSlug.js';

const UUID = '019fe82d-0e24-7301-9426-14ec19f772c3';

describe('routing/idSlug', () => {
  it('slugify lowercases, collapses non-alphanumeric runs, and trims leading/trailing hyphens', () => {
    expect(slugify('Premium Wireless Headphones!!')).toBe('premium-wireless-headphones');
    expect(slugify('  --Weird__Name--  ')).toBe('weird-name');
  });

  it('buildIdSlugSegment produces a real {id}-{slug} composite segment', () => {
    expect(buildIdSlugSegment(UUID, 'Premium Wireless Headphones')).toBe(`${UUID}-premium-wireless-headphones`);
  });

  it('buildIdSlugSegment falls back to the bare id when the name slugifies to nothing', () => {
    expect(buildIdSlugSegment(UUID, '!!!')).toBe(UUID);
  });

  it('extractIdFromSegment recovers the authoritative UUID from a composite segment', () => {
    expect(extractIdFromSegment(`${UUID}-premium-wireless-headphones`)).toBe(UUID);
  });

  it('extractIdFromSegment returns a bare id segment unchanged', () => {
    expect(extractIdFromSegment(UUID)).toBe(UUID);
  });

  it('extractIdFromSegment returns a non-UUID segment as-is, letting the Gateway itself produce the correct, honest 501 (never silently rewriting a genuinely malformed URL)', () => {
    expect(extractIdFromSegment('not-a-real-id')).toBe('not-a-real-id');
  });

  it('the round trip (build then extract) always recovers the original id', () => {
    expect(extractIdFromSegment(buildIdSlugSegment(UUID, 'Anything At All'))).toBe(UUID);
  });
});
