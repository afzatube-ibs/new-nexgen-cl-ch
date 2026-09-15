import { describe, expect, it } from 'vitest';
import { pricingNavigation } from './module.js';

describe('pricing merchant navigation', () => {
  it('keeps diagnostics out of the daily sidebar', () => {
    const children = pricingNavigation[0]?.children ?? [];
    const labels = children.map((item) => item.label);

    expect(labels).toContain('Product Prices');
    expect(labels).toContain('Missing Prices');
    expect(labels).not.toContain('Price Lookup');
    expect(labels).not.toContain('Checkout Preview');
    expect(labels).not.toContain('Currency Coverage');
  });
});
