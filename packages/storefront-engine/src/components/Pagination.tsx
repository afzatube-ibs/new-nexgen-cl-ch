import Link from 'next/link';
import { Icon, cn } from '@nexgen/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '../gateway/types.js';

/**
 * Store Components library — a real, link-based (server-renderable, no
 * client JS required) pagination control built from the Gateway's own
 * real `PaginationMeta` (`currentPage`/`lastPage`/`perPage`/`total` —
 * `gateway/types.ts`, confirmed against `apps/store-api-gateway`'s own
 * response shape). Deliberately plain `<Link>`s, not client-side
 * `router.push`, so pagination works with JS disabled and every page is a
 * real, bookmarkable, crawlable URL — `STORE_FRONTEND_ARCHITECTURE.md`
 * §2's own SEO-friendly-URL requirement applied to pagination
 * specifically, and the concrete seam this milestone's own "infinite-
 * scroll-ready architecture" item names: a future infinite-scroll
 * enhancement progressively upgrades this same link list on the client,
 * it never replaces it.
 */
export interface PaginationProps {
  pagination: PaginationMeta;
  buildHref: (page: number) => string;
  className?: string;
  /** Max numbered page links shown around the current page (default 2 on each side). */
  siblingCount?: number;
}

function pageRange(current: number, last: number, siblingCount: number): (number | 'ellipsis')[] {
  const start = Math.max(1, current - siblingCount);
  const end = Math.min(last, current + siblingCount);
  const pages: (number | 'ellipsis')[] = [];

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('ellipsis');
  }
  for (let page = start; page <= end; page++) pages.push(page);
  if (end < last) {
    if (end < last - 1) pages.push('ellipsis');
    pages.push(last);
  }
  return pages;
}

export function Pagination({ pagination, buildHref, className, siblingCount = 2 }: PaginationProps) {
  const { currentPage, lastPage } = pagination;
  if (lastPage <= 1) return null;

  const pages = pageRange(currentPage, lastPage, siblingCount);
  const linkClass =
    'flex h-10 min-w-10 items-center justify-center rounded-md px-2 text-body text-text-primary transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2';

  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-center gap-1', className)}>
      {currentPage > 1 ? (
        <Link href={buildHref(currentPage - 1)} aria-label="Previous page" className={linkClass}>
          <Icon icon={ChevronLeft} size="standalone" />
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(linkClass, 'pointer-events-none opacity-40')}>
          <Icon icon={ChevronLeft} size="standalone" />
        </span>
      )}

      {pages.map((page, index) =>
        page === 'ellipsis' ? (
          // eslint-disable-next-line react/no-array-index-key -- there are at most two ellipsis spans, on opposite, fixed sides of the page list; the index is a stable, real differentiator here, not a data-derived key standing in for identity.
          <span key={`ellipsis-${index}`} className="flex h-10 min-w-10 items-center justify-center text-text-secondary" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={page}
            href={buildHref(page)}
            aria-current={page === currentPage ? 'page' : undefined}
            className={cn(linkClass, page === currentPage && 'bg-brand text-white hover:bg-brand')}
          >
            {page}
          </Link>
        ),
      )}

      {currentPage < lastPage ? (
        <Link href={buildHref(currentPage + 1)} aria-label="Next page" className={linkClass}>
          <Icon icon={ChevronRight} size="standalone" />
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(linkClass, 'pointer-events-none opacity-40')}>
          <Icon icon={ChevronRight} size="standalone" />
        </span>
      )}
    </nav>
  );
}
