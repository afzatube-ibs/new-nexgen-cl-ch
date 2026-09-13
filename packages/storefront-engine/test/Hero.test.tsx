// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Hero } from '../src/primitives/Hero.js';

const featuredProduct = {
  id: 'product-1',
  name: 'Modern Baby Bassinet',
  slug: 'modern-baby-bassinet',
  sku: 'BASSINET-1',
  shortDescription: 'Comfort close to you.',
  status: 'active',
  visibility: 'catalog_search',
  brandId: null,
  image: { src: '/media/bassinet.webp', srcSet: [], alt: 'Blue and black baby bassinet' },
  price: {
    currencyCode: 'BDT',
    basePrice: '5990.0000',
    compareAtPrice: null,
    salePrice: null,
    effectivePrice: '5990.0000',
    isSaleActive: false,
  },
  availability: { isAvailable: true },
};

afterEach(cleanup);

describe('Hero featured product', () => {
  it('renders real product media, pricing and availability when enabled', () => {
    render(
      <Hero
        heading="Everything your little one needs"
        showFeaturedProduct
        featuredProduct={featuredProduct}
        featuredProductHref="/products/product-1-modern-baby-bassinet"
      />,
    );

    expect(screen.getByRole('link', { name: 'View Modern Baby Bassinet' }).getAttribute('href')).toBe('/products/product-1-modern-baby-bassinet');
    expect(screen.getByRole('img', { name: 'Blue and black baby bassinet' })).not.toBeNull();
    expect(screen.getByText('BDT 5,990.00')).not.toBeNull();
    expect(screen.getByText('In Stock')).not.toBeNull();
  });

  it('keeps the merchant hero text-only when product merchandising is disabled', () => {
    render(<Hero heading="Our baby store" showFeaturedProduct={false} featuredProduct={featuredProduct} featuredProductHref="/products/product-1" />);

    expect(screen.queryByText('Modern Baby Bassinet')).toBeNull();
    expect(screen.queryByText('Featured product')).toBeNull();
  });
});
