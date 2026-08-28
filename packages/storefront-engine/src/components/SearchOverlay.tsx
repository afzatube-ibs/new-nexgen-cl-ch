'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, Icon, Input, Text } from '@nexgen/ui';
import { Search, X } from 'lucide-react';
import { addRecentSearch, clearRecentSearches, getRecentSearches } from './recentSearches.js';
import { PriceBlock } from './PriceBlock.js';
import { toMoney } from '../pricing/toMoney.js';
import { searchProducts, SearchRequestError, type SearchResult } from '../search/searchClient.js';

/**
 * neXgen Production Sprint — Milestone 2 completion. The real Gateway
 * `GET /v1/search` route (price-composed this same milestone) is now
 * genuinely called from here — the gap this component's own prior
 * docblock named honestly ("no Search backend... deliberately not
 * called") is closed. Real debounce (300ms, request-superseding via
 * `AbortController` — a fast typist never sees a stale response race
 * ahead of a newer one), a real loading state, a real honest empty state
 * ("No products match..."), and Enter/submit navigates to a real
 * `/search?q=` results page (`app/search/page.tsx`) for the full,
 * paginated list — this overlay itself stays a fast, compact preview,
 * the same real/compact split every other quick-preview surface on this
 * Storefront already uses (`QuickViewModal` vs. the full PDP).
 *
 * **Recent search** (`recentSearches.ts`, `localStorage`-backed) is
 * unchanged, still real.
 */
export interface SearchOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEBOUNCE_MS = 300;

export function SearchOverlay({ open, onOpenChange }: SearchOverlayProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setRecent(getRecentSearches());
      setQuery('');
      setResults([]);
      setSearched(false);
      setError(null);
      // Radix Dialog moves focus to its own Content root by default on
      // open — this moves it one step further, onto the actual search
      // input, without the a11y footguns of the HTML `autofocus`
      // attribute (`jsx-a11y/no-autofocus`): scoped to this one
      // already-focus-trapped dialog, not the page's own initial load.
      const timeout = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  // Real debounce: waits DEBOUNCE_MS of no typing, then fires exactly one
  // real request, cancelling any still-in-flight prior one via the same
  // AbortController this effect's own cleanup already tears down on
  // every keystroke — a faster typist never races a slower, stale
  // response into view.
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      setSearched(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setLoading(true);
      setError(null);
      searchProducts(query, { signal: controller.signal })
        .then((data) => {
          setResults(data);
          setSearched(true);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setError(err instanceof SearchRequestError ? err.message : 'Something went wrong searching. Please try again.');
          setSearched(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  function goToResultsPage() {
    const term = query.trim();
    if (!term) return;
    setRecent(addRecentSearch(term));
    onOpenChange(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    goToResultsPage();
  }

  function handleRecentClick(term: string) {
    setQuery(term);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="top-24 flex max-h-[70vh] -translate-y-0 flex-col gap-4" aria-describedby={undefined}>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Icon icon={Search} size="standalone" className="text-text-secondary" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
            className="flex-1 border-none px-0 text-body-strong focus-visible:ring-0"
          />
        </form>

        {query.trim() ? (
          <div className="flex flex-col gap-2 overflow-y-auto" aria-live="polite">
            {loading && (
              <Text as="p" variant="body" className="text-text-secondary">
                Searching…
              </Text>
            )}
            {!loading && error && (
              <Text as="p" variant="body" role="alert" className="text-feedback-danger">
                {error}
              </Text>
            )}
            {!loading && !error && searched && results.length === 0 && (
              <Text as="p" variant="body" role="status" className="text-text-secondary">
                No products match &quot;{query.trim()}&quot;.
              </Text>
            )}
            {!loading && !error && results.length > 0 && (
              <ul className="flex flex-col divide-y divide-border">
                {results.slice(0, 6).map((result) => {
                  const { price } = toMoney(result.price);
                  return (
                    <li key={result.id}>
                      <a
                        href={`/products/${result.id}`}
                        onClick={() => onOpenChange(false)}
                        className="flex items-center justify-between gap-3 py-2.5 hover:bg-surface-subtle"
                      >
                        <Text as="span" variant="body">
                          {result.name}
                        </Text>
                        <PriceBlock price={price} size="sm" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
            {!loading && !error && results.length > 6 && (
              <button type="button" onClick={goToResultsPage} className="text-left text-caption text-brand hover:underline">
                See all {results.length} results
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 overflow-y-auto">
            {recent.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-caption font-medium text-text-secondary">Recent searches</p>
                  <button
                    type="button"
                    onClick={() => {
                      clearRecentSearches();
                      setRecent([]);
                    }}
                    className="flex items-center gap-1 text-caption text-text-secondary hover:text-text-primary"
                  >
                    <Icon icon={X} size="inline" />
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recent.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handleRecentClick(term)}
                      className="rounded-full border border-border px-3 py-1 text-caption text-text-primary hover:bg-surface-subtle"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <p className="text-caption font-medium text-text-secondary">Popular searches</p>
              <p className="text-caption text-text-secondary">Popular searches will appear here once available.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
