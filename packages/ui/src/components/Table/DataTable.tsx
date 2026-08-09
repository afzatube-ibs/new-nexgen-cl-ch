import type { ReactNode } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './Table.js';
import { Checkbox } from '../Checkbox/Checkbox.js';
import { Skeleton } from '../Skeleton/Skeleton.js';
import { EmptyState, type EmptyStateProps } from '../EmptyState/EmptyState.js';
import { ErrorState } from '../ErrorState/ErrorState.js';

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableSortState {
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  /** DESIGN_SYSTEM.md §2 Table states: loading (Skeleton rows), empty (Empty State), error (Error State), populated. */
  status?: 'loading' | 'error' | 'success';
  onRetry?: () => void;
  emptyState?: Partial<EmptyStateProps>;
  sort?: DataTableSortState | null;
  onSortChange?: (sort: DataTableSortState | null) => void;
  /** Row selection (table header "select all" checkbox, per Checkbox's own indeterminate state) — omit both to disable selection entirely. */
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  onRowClick?: (row: T) => void;
  skeletonRowCount?: number;
}

/**
 * The composed, data-driven Table — DESIGN_SYSTEM.md §2's "Table" component
 * (sortable columns, row selection, sticky header states). Every future
 * module's list screen consumes this rather than hand-rolling its own
 * `<table>`, per Phase 2.1's "everything reusable" instruction.
 */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  status = 'success',
  onRetry,
  emptyState,
  sort,
  onSortChange,
  selectedIds,
  onSelectionChange,
  onRowClick,
  skeletonRowCount = 5,
}: DataTableProps<T>) {
  const selectable = selectedIds !== undefined && onSelectionChange !== undefined;
  const allSelected = selectable && data.length > 0 && data.every((row) => selectedIds.has(getRowId(row)));
  const someSelected = selectable && !allSelected && data.some((row) => selectedIds.has(getRowId(row)));

  function toggleAll(): void {
    if (!selectable) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(getRowId)));
    }
  }

  function toggleRow(id: string): void {
    if (!selectable) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }

  function handleSort(columnId: string): void {
    if (!onSortChange) return;
    if (sort?.columnId !== columnId) {
      onSortChange({ columnId, direction: 'asc' });
    } else if (sort.direction === 'asc') {
      onSortChange({ columnId, direction: 'desc' });
    } else {
      onSortChange(null);
    }
  }

  if (status === 'error') {
    return <ErrorState onRetry={onRetry} />;
  }

  if (status === 'success' && data.length === 0) {
    return <EmptyState title="No results" {...emptyState} />;
  }

  return (
    <Table>
      <TableHeader className="sticky top-0">
        <TableRow>
          {selectable && (
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={toggleAll}
                aria-label="Select all rows"
              />
            </TableHead>
          )}
          {columns.map((column) => (
            <TableHead
              key={column.id}
              className={column.className}
              sortable={column.sortable}
              sortDirection={sort?.columnId === column.id ? sort.direction : null}
              onSort={() => handleSort(column.id)}
            >
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {status === 'loading'
          ? Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
              // eslint-disable-next-line react/no-array-index-key -- skeleton placeholder rows have no stable identity
              <TableRow key={rowIndex}>
                {selectable && (
                  <TableCell>
                    <Skeleton shape="block" className="size-4" />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.id}>
                    <Skeleton shape="text" className="w-3/4" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          : data.map((row) => {
              const id = getRowId(row);
              return (
                <TableRow
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                  data-state={selectable && selectedIds.has(id) ? 'selected' : undefined}
                >
                  {selectable && (
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(id)}
                        onCheckedChange={() => toggleRow(id)}
                        aria-label={`Select row ${id}`}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.id} className={column.className}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
      </TableBody>
    </Table>
  );
}
