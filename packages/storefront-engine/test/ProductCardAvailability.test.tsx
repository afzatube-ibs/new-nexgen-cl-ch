import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductCard } from '../src/primitives/ProductCard.js';

const baseProduct = {
  id: 'p1',
  name: 'Widget',
  slug: 'widget',
  sku: 'SKU-1',
  shortDescription: null,
  status: 'active',
  visibility: 'catalog_search',
  brandId: null,
  image: null,
  price: null,
};

describe('ProductCard inventory availability', () => {
  it('shows a real in-stock badge for positive Inventory availability', () => {
    render(<ProductCard product={{ ...baseProduct, availability: { isAvailable: true } }} href="/products/p1" />);
    expect(screen.getByText('In Stock')).toBeInTheDocument();
  });

  it('shows out-of-stock and disables quick add for zero Inventory availability', () => {
    render(<ProductCard product={{ ...baseProduct, availability: { isAvailable: false } }} href="/products/p1" />);
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
  });

  it('makes no stock claim when Inventory is unknown', () => {
    render(<ProductCard product={{ ...baseProduct, availability: null }} href="/products/p1" />);
    expect(screen.queryByText('In Stock')).not.toBeInTheDocument();
    expect(screen.queryByText('Out of stock')).not.toBeInTheDocument();
  });
});
