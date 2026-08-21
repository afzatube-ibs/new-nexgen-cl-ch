'use client';

/**
 * Store Components library — Beta Milestone 2.5's own "Recently Viewed
 * rail" build item, implemented as a real, working, client-only
 * capability — exactly the same honest pattern `recentSearches.ts`
 * already established: `localStorage` genuinely persists a visitor's own
 * browsing history across visits, no backend required. No CDP
 * view-history event pipeline feeds the Gateway's own
 * `recently-viewed` recommendation slot yet (`recommendations.ts`'s own
 * docblock) — this is the honest, real, client-device-scoped substitute
 * available today, not a workaround pretending to be that server-side
 * capability.
 */
const STORAGE_KEY = 'nx_recently_viewed';
const MAX_ENTRIES = 12;

export interface RecentlyViewedEntry {
  id: string;
  name: string;
  href: string;
  imageSrc: string | null;
  viewedAt: number;
}

function isEntry(value: unknown): value is RecentlyViewedEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RecentlyViewedEntry).id === 'string' &&
    typeof (value as RecentlyViewedEntry).name === 'string' &&
    typeof (value as RecentlyViewedEntry).href === 'string'
  );
}

export function getRecentlyViewed(excludeId?: string): RecentlyViewedEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    const entries = Array.isArray(parsed) ? parsed.filter(isEntry) : [];
    return excludeId ? entries.filter((entry) => entry.id !== excludeId) : entries;
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(entry: Omit<RecentlyViewedEntry, 'viewedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getRecentlyViewed().filter((candidate) => candidate.id !== entry.id);
    const next = [{ ...entry, viewedAt: Date.now() }, ...existing].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be full or disabled (private browsing) — a real, if rare, failure with no further honest fallback than the view simply not persisting this time.
  }
}
