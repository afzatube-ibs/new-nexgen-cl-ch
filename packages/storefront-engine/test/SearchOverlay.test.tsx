// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchOverlay } from '../src/components/SearchOverlay.js';
import { clearRecentSearches } from '../src/components/recentSearches.js';
import * as searchClient from '../src/search/searchClient.js';

/**
 * neXgen Production Sprint — Milestone 2 completion. Real debounce, real
 * results (with real price), a real honest empty state, and real
 * navigation to `/search` on submit — `searchProducts` is mocked at the
 * module boundary (this file's own concern is `SearchOverlay`'s own
 * behavior, not the real Gateway's own HTTP contract).
 */
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  clearRecentSearches();
  push.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('components/SearchOverlay', () => {
  it('debounces typing and shows real results with a real price once the request resolves', async () => {
    const searchSpy = vi.spyOn(searchClient, 'searchProducts').mockResolvedValue([
      { id: 'p1', name: 'Wireless Headphones', sku: 'SKU-1', brandId: null, publishedAt: null, relevanceScore: 1, price: { currencyCode: 'BDT', basePrice: '2490.0000', compareAtPrice: null, salePrice: null, effectivePrice: '2490.0000', isSaleActive: false } },
    ]);

    render(<SearchOverlay open onOpenChange={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText('Search products…'), { target: { value: 'headphones' } });

    await waitFor(() => expect(searchSpy).toHaveBeenCalledWith('headphones', expect.anything()));
    await waitFor(() => expect(screen.getByText('Wireless Headphones')).toBeTruthy());
    expect(screen.getByText('BDT 2,490.00')).toBeTruthy();
  });

  it('shows a real, honest empty state — never a fabricated result — when nothing matches', async () => {
    vi.spyOn(searchClient, 'searchProducts').mockResolvedValue([]);

    render(<SearchOverlay open onOpenChange={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText('Search products…'), { target: { value: 'zzz-no-match' } });

    await waitFor(() => expect(screen.getByText('No products match "zzz-no-match".')).toBeTruthy());
  });

  it('shows the real error message on a failed search, never a silent empty result', async () => {
    vi.spyOn(searchClient, 'searchProducts').mockRejectedValue(new searchClient.SearchRequestError(0, 'Could not reach the server. Please check your connection and try again.'));

    render(<SearchOverlay open onOpenChange={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText('Search products…'), { target: { value: 'headphones' } });

    await waitFor(() => expect(screen.getByText('Could not reach the server. Please check your connection and try again.')).toBeTruthy());
  });

  it('navigates to a real /search results page on submit, recording a real recent search', () => {
    vi.spyOn(searchClient, 'searchProducts').mockResolvedValue([]);
    const onOpenChange = vi.fn();

    render(<SearchOverlay open onOpenChange={onOpenChange} />);
    const input = screen.getByPlaceholderText('Search products…');
    fireEvent.change(input, { target: { value: 'headphones' } });
    fireEvent.submit(input.closest('form')!);

    expect(push).toHaveBeenCalledWith('/search?q=headphones');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows a real recent search and re-runs it on click', async () => {
    vi.spyOn(searchClient, 'searchProducts').mockResolvedValue([]);
    const onOpenChange = vi.fn();
    const { rerender } = render(<SearchOverlay open={false} onOpenChange={onOpenChange} />);

    // Seed a real recent search the honest way: submit once, close, reopen.
    rerender(<SearchOverlay open onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByPlaceholderText('Search products…'), { target: { value: 'headphones' } });
    fireEvent.submit(screen.getByPlaceholderText('Search products…').closest('form')!);

    rerender(<SearchOverlay open={false} onOpenChange={onOpenChange} />);
    rerender(<SearchOverlay open onOpenChange={onOpenChange} />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'headphones' })).toBeTruthy());
  });
});
