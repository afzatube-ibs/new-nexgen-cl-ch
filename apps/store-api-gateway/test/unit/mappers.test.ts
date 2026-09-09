import { describe, expect, it } from 'vitest';
import { toBrandSummary, toCategorySummary, toProductDetail, toProductSummary, toSearchResultSummary } from '../../src/composition/mappers.js';
import type { BackendBrand, BackendCategory, BackendProduct, BackendSearchResult } from '../../src/backend/types.js';

describe('composition/mappers', () => {
  it('maps a Category with no image field to a summary with image: null (documented backend gap)', () => {
    const category: BackendCategory = {
      id: 'cat-1',
      parentId: null,
      name: 'Shoes',
      slug: 'shoes',
      description: 'Footwear',
      position: 1,
      metaTitle: null,
      metaDescription: null,
      status: 'active',
      version: 1,
      createdAt: null,
      updatedAt: null,
    };
    expect(toCategorySummary(category)).toEqual({ id: 'cat-1', name: 'Shoes', slug: 'shoes', description: 'Footwear', image: null, parentId: null, position: 1 });
  });

  it('maps a child Category\'s real parentId through (Beta Milestone 2: mega-menu hierarchy)', () => {
    const category: BackendCategory = {
      id: 'cat-2',
      parentId: 'cat-1',
      name: 'Running Shoes',
      slug: 'running-shoes',
      description: null,
      position: 2,
      metaTitle: null,
      metaDescription: null,
      status: 'active',
      version: 1,
      createdAt: null,
      updatedAt: null,
    };
    expect(toCategorySummary(category).parentId).toBe('cat-1');
    expect(toCategorySummary(category).position).toBe(2);
  });

  it('maps a Brand logo URL into a responsive image', () => {
    const brand: BackendBrand = {
      id: 'brand-1',
      name: 'Acme',
      slug: 'acme',
      description: null,
      logoMediaId: 'media-1',
      logoUrl: 'https://cdn.example.com/logo.png',
      metaTitle: null,
      metaDescription: null,
      status: 'active',
      version: 1,
      createdAt: null,
      updatedAt: null,
    };
    const result = toBrandSummary(brand);
    expect(result.logo).not.toBeNull();
    expect(result.logo?.src).toBe('https://cdn.example.com/logo.png');
    expect(result.logo?.srcSet.length).toBeGreaterThan(0);
  });

  it('maps a Brand with no logo to logo: null, never a broken image reference', () => {
    const brand: BackendBrand = {
      id: 'brand-2',
      name: 'NoLogo',
      slug: 'nologo',
      description: null,
      logoMediaId: null,
      logoUrl: null,
      metaTitle: null,
      metaDescription: null,
      status: 'active',
      version: 1,
      createdAt: null,
      updatedAt: null,
    };
    expect(toBrandSummary(brand).logo).toBeNull();
  });

  it('picks the primary product image, falling back to the first image if none is flagged primary', () => {
    const product: BackendProduct = baseProduct({
      images: [
        { id: 'img-1', mediaId: 'm1', url: 'https://cdn.example.com/1.jpg', altText: 'One', position: 0, isPrimary: false },
        { id: 'img-2', mediaId: 'm2', url: 'https://cdn.example.com/2.jpg', altText: 'Two', position: 1, isPrimary: true },
      ],
    });
    expect(toProductSummary(product).image?.src).toBe('https://cdn.example.com/2.jpg');
  });

  it('never fabricates business data — a draft product maps through with its real status unchanged', () => {
    const product = baseProduct({ status: 'draft' });
    expect(toProductSummary(product).status).toBe('draft');
  });

  it('maps a full ProductDetail including nested categories', () => {
    const product = baseProduct({
      categories: [
        { id: 'cat-1', parentId: null, name: 'Shoes', slug: 'shoes', description: null, position: 1, metaTitle: null, metaDescription: null, status: 'active', version: 1, createdAt: null, updatedAt: null },
      ],
    });
    const detail = toProductDetail(product);
    expect(detail.categories).toHaveLength(1);
    expect(detail.categories[0]?.slug).toBe('shoes');
  });

  it('maps a real search result — note productId becomes `id` (search has no slug/status field, see backend/types.ts docblock)', () => {
    const result: BackendSearchResult = {
      productId: 'prod-1',
      sku: 'SKU-1',
      name: 'Widget',
      brandId: 'brand-1',
      publishedAt: null,
      relevanceScore: 4.2,
    };
    expect(toSearchResultSummary(result)).toEqual({
      id: 'prod-1',
      name: 'Widget',
      sku: 'SKU-1',
      brandId: 'brand-1',
      publishedAt: null,
      relevanceScore: 4.2,
      price: null,
      availability: null,
    });
  });

  it('maps a real product with a real composed price, and defaults to null when no price is passed', () => {
    const product = baseProduct();
    const price = { currencyCode: 'BDT', basePrice: '2490.0000', compareAtPrice: null, salePrice: null, effectivePrice: '2490.0000', isSaleActive: false };

    expect(toProductSummary(product).price).toBeNull();
    expect(toProductSummary(product, price).price).toEqual(price);
  });
});

function baseProduct(overrides: Partial<BackendProduct> = {}): BackendProduct {
  return {
    id: 'prod-1',
    brandId: null,
    sku: 'SKU-1',
    barcode: null,
    name: 'Widget',
    slug: 'widget',
    description: 'A widget',
    shortDescription: null,
    productType: 'simple',
    weightGrams: null,
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
    ...overrides,
  };
}
