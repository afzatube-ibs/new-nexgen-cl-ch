import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { Button } from '../Button/Button.js';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function pageWindow(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const page = sorted[i]!;
    if (i > 0 && page - sorted[i - 1]! > 1) result.push('ellipsis');
    result.push(page);
  }
  return result;
}

/** DESIGN_SYSTEM.md §2 — Pagination: page-number + prev/next. (Cursor-based pagination, for very large result sets, is a documented future variant of this same component.) */
export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-center gap-1', className)}>
      <Button
        variant="ghost"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </Button>
      {pageWindow(currentPage, totalPages).map((page, index) =>
        page === 'ellipsis' ? (
          // eslint-disable-next-line react/no-array-index-key -- ellipsis markers have no stable identity
          <span key={`ellipsis-${index}`} className="px-2 text-text-secondary">
            …
          </span>
        ) : (
          <Button
            key={page}
            variant={page === currentPage ? 'primary' : 'ghost'}
            size="sm"
            aria-current={page === currentPage ? 'page' : undefined}
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ),
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}
