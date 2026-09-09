// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
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

afterEach(() => cleanup());

describe('ProductCard inventory availability', () => {
  it('shows a real in-stock badge for positive Inventory availability', () => {
    render(<ProductCard product={{ ...baseProduct, availability: { isAvailable: true } }} href="/products/p1" />);
    expect(screen.getByText('In Stock')).not.toBeNull();
    expect(screen.getByText('COD available')).not.toBeNull();
  });

  it('shows out-of-stock, blocks quick add, and does not advertise COD for an unsellable item', () => {
    render(<ProductCard product={{ ...baseProduct, availability: { isAvailable: false } }} href="/products/p1" />);
    expect(screen.getAllByText('Out of stock').length).toBeGreaterThan(0);
    const blockedButton = screen.getByRole('button', { name: 'Widget — Out of stock' }) as HTMLButtonElement;
    expect(blockedButton.disabled).toBe(true);
    expect(screen.queryByText('COD available')).toBeNull();
  });

  it('makes no stock claim when Inventory is unknown', () => {
    render(<ProductCard product={{ ...baseProduct, availability: null }} href="/products/p1" />);
    expect(screen.queryByText('In Stock')).toBeNull();
    expect(screen.queryByText('Out of stock')).toBeNull();
  });
});
