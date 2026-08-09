import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@nexgen/ui';

export interface ToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Filter Bar, view toggles, etc. — rendered between search and actions. */
  filters?: ReactNode;
  /** Primary/secondary action buttons (e.g. "New Product", Export). */
  actions?: ReactNode;
}

/** Shared Framework — the standard list-page toolbar (search + filters + actions) every CRUD screen composes with, per Phase 2.1 §6. */
export function Toolbar({ searchValue, onSearchChange, searchPlaceholder = 'Search…', filters, actions }: ToolbarProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {onSearchChange && (
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
              aria-label="Search"
            />
          </div>
        )}
        {filters}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
