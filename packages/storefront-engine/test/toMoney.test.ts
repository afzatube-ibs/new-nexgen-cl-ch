import { describe, expect, it } from 'vitest';
import { toMoney } from '../src/pricing/toMoney.js';
import type { ComposedPrice } from '../src/gateway/types.js';

function price(overrides: Partial<ComposedPrice> = {}): ComposedPrice {
  return {
    currencyCode: 'BDT',
    basePrice: '2490.0000',
    compareAtPrice: null,
    salePrice: null,
    effectivePrice: '2490.0000',
    isSaleActive: false,
    ...overrides,
  };
}

describe('pricing/toMoney', () => {
  it('returns null price and null compareAtPrice for no real price (honest "Price coming soon")', () => {
    expect(toMoney(null)).toEqual({ price: null, compareAtPrice: null });
    expect(toMoney(undefined)).toEqual({ price: null, compareAtPrice: null });
  });

  it('converts a real, no-sale price to minor units with no compareAtPrice', () => {
    expect(toMoney(price())).toEqual({
      price: { amountMinor: 249000, currencyCode: 'BDT' },
      compareAtPrice: null,
    });
  });

  it('uses the real base price as the crossed-out price while a real sale is active', () => {
    const result = toMoney(price({ basePrice: '2490.0000', salePrice: '1990.0000', effectivePrice: '1990.0000', isSaleActive: true }));
    expect(result.price).toEqual({ amountMinor: 199000, currencyCode: 'BDT' });
    expect(result.compareAtPrice).toEqual({ amountMinor: 249000, currencyCode: 'BDT' });
  });

  it('uses the real, operator-set compareAtPrice when there is no active sale', () => {
    const result = toMoney(price({ basePrice: '2490.0000', compareAtPrice: '2990.0000', effectivePrice: '2490.0000', isSaleActive: false }));
    expect(result.price).toEqual({ amountMinor: 249000, currencyCode: 'BDT' });
    expect(result.compareAtPrice).toEqual({ amountMinor: 299000, currencyCode: 'BDT' });
  });

  it('never shows a compareAtPrice that is not actually higher than the real price — no fabricated discount', () => {
    const result = toMoney(price({ basePrice: '2490.0000', compareAtPrice: '2000.0000', effectivePrice: '2490.0000', isSaleActive: false }));
    expect(result.compareAtPrice).toBeNull();
  });
});
