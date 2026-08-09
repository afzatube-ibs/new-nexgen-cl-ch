import { Filter, X } from 'lucide-react';
import { Button, Badge, Popover, PopoverTrigger, PopoverContent } from '@nexgen/ui';

export interface FilterValue {
  key: string;
  label: string;
  /** Human-readable current value, e.g. "Active" — the filter's own editing UI is caller-supplied via `children`, per each module's own filter shape. */
  displayValue: string;
}

export interface FilterBarProps {
  active: FilterValue[];
  onRemove: (key: string) => void;
  onClearAll?: () => void;
  /** The actual filter-editing controls (Select/Checkbox/date-range/etc.) — module-specific, rendered inside the "Filters" popover. */
  children?: React.ReactNode;
}

/** Shared Framework — active-filter chips + a popover for editing them. Each module supplies its own filter fields as `children`; this owns only the chip/popover chrome. */
export function FilterBar({ active, onRemove, onClearAll, children }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="size-4" />
              Filters
              {active.length > 0 && (
                <Badge variant="info" className="ml-1">
                  {active.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            {children}
          </PopoverContent>
        </Popover>
      )}
      {active.map((filter) => (
        <Badge key={filter.key} variant="outline" className="gap-1.5">
          {filter.label}: {filter.displayValue}
          <button type="button" onClick={() => onRemove(filter.key)} aria-label={`Remove ${filter.label} filter`}>
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      {active.length > 0 && onClearAll && (
        <Button variant="ghost" size="sm" onClick={onClearAll}>
          Clear all
        </Button>
      )}
    </div>
  );
}
