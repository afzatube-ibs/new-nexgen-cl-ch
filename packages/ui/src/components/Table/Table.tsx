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

/**
 * `data-[state=selected]` had no visual treatment at all until this pass —
 * `DataTable` has set `data-state="selected"` on a checked row since bulk
 * selection first shipped (Phase 2.2's Catalog module), but this component
 * never actually styled that state: a "selected" row looked identical to
 * an unselected one apart from its checkbox, found during the Design
 * Foundation Refresh's own Table audit ("Improve selected rows").
 */
export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(function TableRow(
  { className, ...props },
  ref,
) {
  return (
    <tr
      ref={ref}
      className={cn(
        'border-b border-border transition-colors duration-fast hover:bg-surface-subtle/60',
        'data-[state=selected]:bg-brand/5 data-[state=selected]:hover:bg-brand/10',
        className,
      )}
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
  // Uppercase + tracked-out, muted — the Design Foundation Refresh's own
  // "improve header readability" finding: enterprise reference dashboards
  // (Stripe, GitHub, Vercel) consistently give table headers this treatment
  // specifically so they read as unambiguously *not* data at a glance, even
  // at the same 12px `text-caption` size a plain label uses elsewhere.
  const HEAD_CLASS = 'h-10 px-4 text-left text-caption font-medium uppercase tracking-wide text-text-secondary';

  if (!sortable) {
    return (
      <th ref={ref} className={cn(HEAD_CLASS, className)} {...props}>
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
      className={cn(HEAD_CLASS, className)}
      {...props}
    >
      {/*
        `uppercase tracking-wide` repeated here, not just inherited from the
        parent `<th>` — browsers' own UA stylesheet resets `text-transform`
        (and other typographic properties) to `none` on form controls
        (`button`/`input`/`select`/...), so a sortable column's own label,
        wrapped in a `<button>` for its click target, silently rendered in
        plain sentence case even though the `<th>` itself correctly computed
        `uppercase` — found live by comparing this component's own rendered
        pixels against `getComputedStyle`, which only reflects the `<th>`'s
        own declared value, not what a nested form control actually paints.
      */}
      <button
        type="button"
        onClick={onSort}
        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {children}
        <SortIcon className="size-3.5" aria-hidden="true" />
      </button>
    </th>
  );
});

/** `py-2.5` (was `py-3`) — a deliberate, modest row-density increase (Design Foundation Refresh's own "improve density" finding): a merchant scanning thousands of rows sees more of them per screen without the row feeling cramped. */
export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(function TableCell(
  { className, ...props },
  ref,
) {
  return <td ref={ref} className={cn('px-4 py-2.5 align-middle text-text-primary', className)} {...props} />;
});

export const TableCaption = forwardRef<HTMLTableCaptionElement, HTMLAttributes<HTMLTableCaptionElement>>(
  function TableCaption({ className, ...props }, ref) {
    return <caption ref={ref} className={cn('mt-4 text-caption text-text-secondary', className)} {...props} />;
  },
);
