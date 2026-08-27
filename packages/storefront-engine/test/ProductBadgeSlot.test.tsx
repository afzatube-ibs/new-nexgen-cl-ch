// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProductBadgeSlot } from '../src/components/ProductBadgeSlot.js';

/**
 * Experience Polish Sprint 1, Pack 2 (item 2.1) — a real test of the one
 * new component this pack introduces. Covers the two behaviors its own
 * docblock promises: it renders nothing when given no real badges (never
 * an empty shell), and it caps real clutter at `maxVisible` rather than
 * silently rendering every badge a future caller might pass.
 */
afterEach(() => {
  cleanup();
});

describe('components/ProductBadgeSlot', () => {
  it('renders nothing when given no badges', () => {
    const { container } = render(<ProductBadgeSlot badges={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders every real badge up to the default cap of 3', () => {
    render(
      <ProductBadgeSlot
        badges={[
          { id: 'a', node: <span>In Stock</span> },
          { id: 'b', node: <span>COD</span> },
          { id: 'c', node: <span>New</span> },
        ]}
      />,
    );

    expect(screen.getByText('In Stock')).toBeTruthy();
    expect(screen.getByText('COD')).toBeTruthy();
    expect(screen.getByText('New')).toBeTruthy();
  });

  it('drops badges past maxVisible rather than overflowing the card', () => {
    render(
      <ProductBadgeSlot
        maxVisible={2}
        badges={[
          { id: 'a', node: <span>In Stock</span> },
          { id: 'b', node: <span>COD</span> },
          { id: 'c', node: <span>New</span> },
        ]}
      />,
    );

    expect(screen.getByText('In Stock')).toBeTruthy();
    expect(screen.getByText('COD')).toBeTruthy();
    expect(screen.queryByText('New')).toBeNull();
  });
});
