import { describe, expect, it, vi } from 'vitest';
import { attachPrices, fetchComposedPrices } from '../../src/composition/pricing.js';
import type { BackendClient } from '../../src/backend/client.js';
import type { BackendPriceListEntry } from '../../src/backend/types.js';

function priceEntry(overrides: Partial<BackendPriceListEntry> = {}): BackendPriceListEntry {
  return {
    id: 'entry-1',
    priceListId: 'list-1',
    sku: 'SKU-1',
    basePrice: '25.0000',
    compareAtPrice: null,
    salePrice: null,
    saleStartsAt: null,
    saleEndsAt: null,
    isSaleActive: false,
    effectivePrice: '25.0000',
    version: 1,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

describe('composition/pricing', () => {
  it('fetchComposedPrices makes exactly one real backend call for many SKUs — never one per SKU', async () => {
    const getList = vi.fn().mockResolvedValue({ data: [priceEntry({ sku: 'SKU-1' }), priceEntry({ sku: 'SKU-2', effectivePrice: '10.0000' })] });
    const backend = { getList } as unknown as BackendClient;

    const prices = await fetchComposedPrices(backend, ['SKU-1', 'SKU-2', 'SKU-3-no-price'], 'BDT', 'corr-1');

    expect(getList).toHaveBeenCalledTimes(1);
    expect(prices.size).toBe(2);
    expect(prices.get('SKU-1')?.effectivePrice).toBe('25.0000');
    expect(prices.get('SKU-2')?.effectivePrice).toBe('10.0000');
    expect(prices.has('SKU-3-NO-PRICE')).toBe(false);
  });

  it('fetchComposedPrices dedupes repeated SKUs before calling the backend', async () => {
    const getList = vi.fn().mockResolvedValue({ data: [priceEntry({ sku: 'SKU-1' })] });
    const backend = { getList } as unknown as BackendClient;

    await fetchComposedPrices(backend, ['SKU-1', 'sku-1', 'SKU-1'], 'BDT', 'corr-1');

    expect(getList).toHaveBeenCalledTimes(1);
    const call = getList.mock.calls[0]?.[0] as { query: { skus: string } };
    expect(call.query.skus).toBe('SKU-1');
  });

  it('fetchComposedPrices returns an empty Map without calling the backend at all for an empty sku list', async () => {
    const getList = vi.fn();
    const backend = { getList } as unknown as BackendClient;

    const prices = await fetchComposedPrices(backend, [], 'BDT', 'corr-1');

    expect(getList).not.toHaveBeenCalled();
    expect(prices.size).toBe(0);
  });

  it('fails open — a real backend failure degrades to an empty Map (never a thrown error) so Catalog browsing is never taken down by a Pricing outage', async () => {
    const getList = vi.fn().mockRejectedValue(new Error('backend unreachable'));
    const backend = { getList } as unknown as BackendClient;
    const warn = vi.fn();

    const prices = await fetchComposedPrices(backend, ['SKU-1'], 'BDT', 'corr-1', { warn } as never);

    expect(prices.size).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('attachPrices merges a real price onto its matching SKU, and null onto one with none', () => {
    const prices = new Map([['SKU-1', { currencyCode: 'BDT', basePrice: '25.0000', compareAtPrice: null, salePrice: null, effectivePrice: '25.0000', isSaleActive: false }]]);
    const items = [{ sku: 'sku-1', name: 'Priced' }, { sku: 'SKU-2', name: 'Unpriced' }];

    const result = attachPrices(items, prices);

    expect(result[0]?.price?.effectivePrice).toBe('25.0000');
    expect(result[1]?.price).toBeNull();
  });
});
