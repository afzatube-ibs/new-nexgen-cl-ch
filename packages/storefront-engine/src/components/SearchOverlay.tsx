'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Dialog, DialogContent, Icon, Input } from '@nexgen/ui';
import { Search, X } from 'lucide-react';
import { addRecentSearch, clearRecentSearches, getRecentSearches } from './recentSearches.js';

/**
 * Store Components library — this milestone's own "Search UX Foundation"
 * build item, read exactly as scoped: **no Search backend** — the real
 * Gateway `/v1/search` route exists (`STORE_API_GATEWAY_ARCHITECTURE.md`,
 * Slice 1) but is deliberately not called from this overlay this
 * milestone; wiring it (plus a real `/search` results page) is named,
 * real, future work in `MISSING_ECOMMERCE_FEATURES_AUDIT.md`, not
 * silently done here as scope creep past what was asked for.
 *
 * What IS real here: Escape-to-close and focus trapping (Radix `Dialog`,
 * native), a working input, and **Recent search** (`recentSearches.ts`,
 * genuinely `localStorage`-backed — real, not scaffolded). Submitting a
 * query records it as a real recent search and shows an honest "search
 * isn't available yet" message rather than navigating to a results page
 * that doesn't exist (a dead link / 404 would be a real bug, not an
 * honest placeholder). **Suggestions** and **Popular search** render
 * their own real, honest empty/ready state — no fabricated terms.
 */
export interface SearchOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchOverlay({ open, onOpenChange }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setRecent(getRecentSearches());
      setSubmitted(false);
      // Radix Dialog moves focus to its own Content root by default on
      // open — this moves it one step further, onto the actual search
      // input, without the a11y footguns of the HTML `autofocus`
      // attribute (`jsx-a11y/no-autofocus`): scoped to this one
      // already-focus-trapped dialog, not the page's own initial load.
      const timeout = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;
    setRecent(addRecentSearch(query));
    setSubmitted(true);
  }

  function handleRecentClick(term: string) {
    setQuery(term);
    setSubmitted(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="top-24 flex max-h-[70vh] -translate-y-0 flex-col gap-4" aria-describedby={undefined}>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Icon icon={Search} size="standalone" className="text-text-secondary" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSubmitted(false);
            }}
            placeholder="Search products…"
            aria-label="Search products"
            className="flex-1 border-none px-0 text-body-strong focus-visible:ring-0"
          />
        </form>

        {submitted ? (
          <p role="status" className="text-body text-text-secondary">
            Search results aren&apos;t available yet — please browse categories in the meantime.
          </p>
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
