import type { ReactNode } from 'react';
import { Pagination } from '@nexgen/ui';
import { PageHeader, type PageHeaderProps } from './PageHeader.js';

export interface CrudPageLayoutProps {
  header: PageHeaderProps;
  toolbar?: ReactNode;
  bulkActions?: ReactNode;
  /** The DataTable (or any content) — this layout owns page chrome only, never the table's own columns/data. */
  children: ReactNode;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

/**
 * Shared Framework — CRUD Page Layout (Phase 2.1 §6): the standard
 * composition every module's list screen follows (PageHeader → Toolbar →
 * BulkActionsBar → table content → Pagination), so no module hand-assembles
 * this structure itself.
 */
export function CrudPageLayout({ header, toolbar, bulkActions, children, pagination }: CrudPageLayoutProps) {
  return (
    <div>
      <PageHeader {...header} />
      {toolbar}
      {bulkActions}
      {children}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </div>
  );
}
