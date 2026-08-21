'use client';

/**
 * Store Components library — the "Recent search architecture" build item,
 * implemented as a real, working, client-only capability: `localStorage`
 * genuinely persists a visitor's own last searches across visits, no
 * backend required (`STOREFRONT_COMPONENT_ENGINE.md`'s own "no Search
 * backend" scope for this milestone, read literally — recent-search
 * history is inherently a client-device concern, not a server one, so
 * it's real today rather than merely scaffolded).
 */
const STORAGE_KEY = 'nx_recent_searches';
const MAX_ENTRIES = 8;

export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed || typeof window === 'undefined') return getRecentSearches();
  const existing = getRecentSearches().filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...existing].slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be full or disabled (private browsing) — a real, if rare, failure with no further honest fallback than the entry simply not persisting this time.
  }
  return next;
}

export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Same rare storage-denied case as addRecentSearch — nothing further to do.
  }
}
