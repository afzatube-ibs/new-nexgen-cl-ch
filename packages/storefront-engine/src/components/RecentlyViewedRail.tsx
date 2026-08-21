'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SectionHeader } from './SectionHeader.js';
import { getRecentlyViewed, type RecentlyViewedEntry } from './recentlyViewed.js';

/**
 * Store Components library — Beta Milestone 2.5's own "Recently Viewed
 * rail" build item. A real, working, client-only component: real
 * `localStorage` history (`recentlyViewed.ts`), rendered only once
 * mounted (`useEffect`, avoiding a server/client markup mismatch — this
 * data genuinely only exists in the browser) and only when there is
 * real history to show — no fabricated "recently viewed" items, no
 * rendering of a skeleton row for data that will never arrive server-side.
 */
export interface RecentlyViewedRailProps {
  excludeId?: string;
  heading?: string;
}

export function RecentlyViewedRail({ excludeId, heading = 'Recently viewed' }: RecentlyViewedRailProps) {
  const [entries, setEntries] = useState<RecentlyViewedEntry[]>([]);

  useEffect(() => {
    setEntries(getRecentlyViewed(excludeId));
  }, [excludeId]);

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader heading={heading} />
      <div className="flex gap-4 overflow-x-auto pb-2">
        {entries.map((entry) => (
          <Link
            key={entry.id}
            href={entry.href}
            className="flex w-32 shrink-0 flex-col gap-2 rounded-lg border border-border bg-surface p-2 transition-shadow duration-fast hover:shadow-elevation-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-md bg-surface-subtle">
              {entry.imageSrc ? (
                <Image src={entry.imageSrc} alt="" fill sizes="128px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-caption text-text-secondary">No image</div>
              )}
            </div>
            <p className="line-clamp-2 text-caption text-text-primary">{entry.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
