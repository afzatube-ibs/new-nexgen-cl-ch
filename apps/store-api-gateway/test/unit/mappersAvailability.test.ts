import { describe, expect, it } from 'vitest';
import { toProductSummary } from '../../src/composition/mappers.js';

const PRODUCT = {
  id: '11111111-1111-1111-1111-111111111111',
  brandId: null,
  sku: 'SKU-1',
  barcode: null,
  name: 'Widget',
  slug: 'widget',
  description: null,
  shortDescription: null,
  productType: 'simple',
  status: 'active',
  visibility: 'catalog_search',
  metaTitle: null,
  metaDescription: null,
  metaKeywords: null,
  metadata: null,
  publishedAt: null,
  images: [],
  categories: [],
  version: 1,
  createdAt: null,
  updatedAt: null,
};

describe('product mapper availability', () => {
  it('keeps availability unknown unless Inventory composition supplies it', () => {
    expect(toProductSummary(PRODUCT).availability).toBeNull();
  });

  it('passes through a real Inventory availability result unchanged', () => {
    expect(toProductSummary(PRODUCT, null, { isAvailable: false }).availability).toEqual({ isAvailable: false });
  });
});
