import { useEffect, useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { Select, Text, Skeleton, EmptyState, ErrorState, Avatar } from '@nexgen/ui';
import { INVENTORY_STOCK_ITEM_TARGET_TYPE, INVENTORY_WAREHOUSE_TARGET_TYPE, type InventoryAuditLogDTO } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar } from '../../../framework/index.js';
import { DeltaBadge } from '../shared/DeltaBadge.js';
import { dayGroupLabel, shortTime } from '../shared/formatTimestamp.js';
import { useInventoryActivity } from './queries.js';
import {
  humanizeAuditAction,
  stockAdjustedDetails,
  stockAdjustedSummary,
  reservationEventDetails,
  reservationEventSummary,
  warehouseSnapshot,
} from './activityFormat.js';
import { StockItemSkuLabel } from './StockItemSkuLabel.js';
import { ActivityEntryIcon } from './ActivityEntryIcon.js';

type TargetFilter = 'all' | 'stock' | 'warehouses';

const TARGET_TYPE_BY_FILTER: Record<TargetFilter, string | undefined> = {
  all: undefined,
  stock: INVENTORY_STOCK_ITEM_TARGET_TYPE,
  warehouses: INVENTORY_WAREHOUSE_TARGET_TYPE,
};

interface DayGroup {
  label: string;
  entries: InventoryAuditLogDTO[];
}

/** Groups (already newest-first, per `AuditLogController::index`'s own `orderByDesc('created_at')`) into same-day buckets — a day boundary is never split within the currently-loaded page, so this is a pure display grouping, not a re-sort. */
function groupByDay(entries: InventoryAuditLogDTO[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const entry of entries) {
    const label = dayGroupLabel(entry.createdAt);
    const last = groups.at(-1);
    if (last && last.label === label) last.entries.push(entry);
    else groups.push({ label, entries: [entry] });
  }
  return groups;
}

/**
 * Inventory Activity / Movement History (Slice 1, UX refinement pass) —
 * `inventory.audit_log.view`. A single, global, real-time feed of every
 * recorded Inventory action (stock adjustments, warehouse changes),
 * answering "what changed, who changed it, when, and why" directly from
 * `AuditLog.before`/`after` — see `activityFormat.ts`'s own docblock for
 * exactly which fields back that. Redesigned as a day-grouped timeline
 * (Today / Yesterday / …) with the delta shown as its own badge rather
 * than buried inside a sentence.
 */
export function InventoryActivityPage() {
  const [filter, setFilter] = useState<TargetFilter>('all');
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [filter]);

  const { data, status, refetch } = useInventoryActivity(TARGET_TYPE_BY_FILTER[filter], page);
  const entries = useMemo(() => data?.data ?? [], [data]);
  const groups = useMemo(() => groupByDay(entries), [entries]);

  return (
    <CrudPageLayout
      header={{ title: 'Activity', description: 'Every recorded stock and warehouse change — what, who, when, and why.' }}
      toolbar={
        <Toolbar
          filters={
            <FilterBar
              active={filter === 'all' ? [] : [{ key: 'target', label: 'Type', displayValue: filter === 'stock' ? 'Stock' : 'Warehouses' }]}
              onRemove={() => setFilter('all')}
            >
              <Select
                label="Type"
                value={filter}
                onValueChange={(v) => setFilter(v as TargetFilter)}
                options={[
                  { value: 'all', label: 'All activity' },
                  { value: 'stock', label: 'Stock' },
                  { value: 'warehouses', label: 'Warehouses' },
                ]}
              />
            </FilterBar>
          }
        />
      }
      pagination={
        data?.meta?.last_page
          ? { currentPage: data.meta.current_page ?? page, totalPages: data.meta.last_page, onPageChange: setPage }
          : undefined
      }
    >
      {status === 'pending' && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key -- skeleton placeholder rows have no stable identity
            <div key={i} className="flex gap-3">
              <Skeleton shape="avatar" className="size-8 shrink-0" />
              <div className="flex-1">
                <Skeleton shape="text" className="h-4 w-48" />
                <Skeleton shape="text" className="mt-2 h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      )}

      {status === 'error' && <ErrorState onRetry={() => void refetch()} />}

      {status === 'success' && entries.length === 0 && (
        <EmptyState
          icon={<History className="size-8" aria-hidden="true" />}
          title="No activity yet"
          description="Stock adjustments and warehouse changes will appear here."
        />
      )}

      {status === 'success' && groups.length > 0 && (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.label}>
              <Text variant="caption" className="mb-3 font-medium uppercase tracking-wide text-text-secondary">
                {group.label}
              </Text>
              <ol className="flex flex-col gap-4">
                {group.entries.map((entry) => {
                  const stockDetails = stockAdjustedDetails(entry);
                  const reservation = reservationEventDetails(entry);
                  const warehouse = warehouseSnapshot(entry);
                  const summary = stockDetails ? stockAdjustedSummary(stockDetails) : reservation ? reservationEventSummary(reservation) : null;
                  const actorInitials = entry.actorId ? entry.actorId.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() : '?';

                  return (
                    <li key={entry.id} className="flex gap-3">
                      <ActivityEntryIcon entry={entry} stockDetails={stockDetails} />
                      <div className="min-w-0 flex-1 border-b border-border pb-4 last:border-b-0 last:pb-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Text variant="body-strong">{humanizeAuditAction(entry.action)}</Text>
                          {stockDetails && <DeltaBadge delta={stockDetails.delta} />}
                          {entry.targetType === INVENTORY_STOCK_ITEM_TARGET_TYPE && entry.targetId && (
                            <StockItemSkuLabel stockItemId={entry.targetId} />
                          )}
                        </div>
                        {(summary || warehouse) && (
                          <Text variant="body" className="mt-0.5 text-text-secondary">
                            {summary ?? (warehouse!.code ? `${warehouse!.name} (${warehouse!.code})` : warehouse!.name)}
                          </Text>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <Avatar fallback={actorInitials} size="sm" />
                          <Text variant="caption" className="text-text-secondary">
                            {entry.actorId ? `${entry.actorId.slice(0, 8)} · ` : ''}
                            {shortTime(entry.createdAt)}
                          </Text>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      )}
    </CrudPageLayout>
  );
}
