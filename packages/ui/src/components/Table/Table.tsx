import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '../../lib/cn.js';

/** DESIGN_SYSTEM.md §2 — Table primitives (native `<table>`, packages/ui's own composition). See `DataTable` for the composed, data-driven version with sorting/selection/pagination wiring. */
export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(function Table(
  { className, ...props },
  ref,
) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border">
      <table ref={ref} className={cn('w-full caption-bottom text-body', className)} {...props} />
    </div>
  );
});

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function TableHeader({ className, ...props }, ref) {
    return <thead ref={ref} className={cn('bg-surface-subtle [&_tr]:border-b [&_tr]:border-border', className)} {...props} />;
  },
);

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function TableBody({ className, ...props }, ref) {
    return <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
  },
);

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(function TableRow(
  { className, ...props },
  ref,
) {
  return (
    <tr
      ref={ref}
      className={cn('border-b border-border transition-colors duration-fast hover:bg-surface-subtle/60', className)}
      {...props}
    />
  );
});

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(function TableHead(
  { className, sortable, sortDirection, onSort, children, ...props },
  ref,
) {
  if (!sortable) {
    return (
      <th
        ref={ref}
        className={cn('h-10 px-4 text-left text-caption font-medium text-text-secondary', className)}
        {...props}
      >
        {children}
      </th>
    );
  }

  const SortIcon = sortDirection === 'asc' ? ArrowUp : sortDirection === 'desc' ? ArrowDown : ArrowUpDown;

  return (
    <th
      ref={ref}
      scope="col"
      aria-sort={sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none'}
      className={cn('h-10 px-4 text-left text-caption font-medium text-text-secondary', className)}
      {...props}
    >
      <button
        type="button"
        onClick={onSort}
        className="inline-flex items-center gap-1 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {children}
        <SortIcon className="size-3.5" aria-hidden="true" />
      </button>
    </th>
  );
});

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(function TableCell(
  { className, ...props },
  ref,
) {
  return <td ref={ref} className={cn('px-4 py-3 align-middle text-text-primary', className)} {...props} />;
});

export const TableCaption = forwardRef<HTMLTableCaptionElement, HTMLAttributes<HTMLTableCaptionElement>>(
  function TableCaption({ className, ...props }, ref) {
    return <caption ref={ref} className={cn('mt-4 text-caption text-text-secondary', className)} {...props} />;
  },
);
