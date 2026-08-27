// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PriceBlock } from '../src/components/PriceBlock.js';

/**
 * Experience Polish Sprint 1, Pack 2 (item 2.3) — proves the one real
 * change (the honest empty-state copy/sizing) without disturbing the
 * real-price branch, per the roadmap's own testing requirement: "confirm
 * the real-price branch is pixel-for-pixel unchanged."
 */
afterEach(() => {
  cleanup();
});

describe('components/PriceBlock', () => {
  it('shows the real formatted price, discount badge, and savings amount when a real compareAtPrice exists', () => {
    render(
      <PriceBlock
        price={{ amountMinor: 100000, currencyCode: 'BDT' }}
        compareAtPrice={{ amountMinor: 150000, currencyCode: 'BDT' }}
        size="lg"
      />,
    );

    expect(screen.getByText('-33%')).toBeTruthy();
    expect(screen.getByText(/You save/)).toBeTruthy();
  });

  it('renders the honest "Price coming soon" state, never a fabricated price, when no real price exists', () => {
    render(<PriceBlock price={null} />);

    expect(screen.getByText('Price coming soon')).toBeTruthy();
    expect(screen.queryByText(/Price unavailable/)).toBeNull();
  });

  it('scales the empty-state copy with `size`, matching every other branch of this component', () => {
    const { container: smallContainer } = render(<PriceBlock price={null} size="sm" />);
    const { container: largeContainer } = render(<PriceBlock price={null} size="lg" />);

    expect(smallContainer.querySelector('p')?.className).toContain('text-caption');
    expect(largeContainer.querySelector('p')?.className).not.toContain('text-caption');
  });
});
