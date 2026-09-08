import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StockBadge } from '../src/components/StockBadge.js';

describe('StockBadge', () => {
  it('renders In Stock only from a positive Inventory result', () => {
    render(<StockBadge status="active" isAvailable={true} />);
    expect(screen.getByText('In Stock')).toBeInTheDocument();
  });

  it('renders Out of stock from a zero Inventory result even when Catalog is active', () => {
    render(<StockBadge status="active" isAvailable={false} />);
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });

  it('renders no stock claim when Inventory availability is unknown', () => {
    const { container } = render(<StockBadge status="active" isAvailable={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders Unavailable for a non-active Catalog product', () => {
    render(<StockBadge status="archived" isAvailable={true} />);
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
  });
});
