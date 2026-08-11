import { useState } from 'react';
import { History } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  Button,
  Text,
  Skeleton,
  EmptyState,
  ErrorState,
  Pagination,
} from '@nexgen/ui';
import type { StockItemDTO, WarehouseDTO } from '@nexgen/api-client';
import { useCatalogProductBySku } from '../shared/catalogLookup.js';
import { StockHealthBadge } from '../shared/StockHealthBadge.js';
import { DeltaBadge } from '../shared/DeltaBadge.js';
import { dayGroupLabel, shortTime } from '../shared/formatTimestamp.js';
import { useStockItemAdjustments } from './queries.js';

export interface StockItemDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockItem: StockItemDTO | undefined;
  warehouse: WarehouseDTO | undefined;
  canManage: boolean;
  onAdjust: () => void;
}

/**
 * Row detail — the answer to "why is available lower than on-hand" without
 * leaving the Stock Levels list (`planning/architecture/
 * PHASE_2_3_INVENTORY_ARCHITECTURE.md` §4.2). Shows this one StockItem's own
 * on-hand/reserved/available breakdown plus its real, per-item adjustment
 * ledger (`GET /stock-items/{id}/adjustments`) — a StockItem's Reservations
 * view is deliberately out of scope for Slice 1 (see the architecture doc's
 * approved slice order).
 */
export function StockItemDetailDrawer({ open, onOpenChange, stockItem, warehouse, canManage, onAdjust }: StockItemDetailDrawerProps) {
  const [page, setPage] = useState(1);
  const { data: product } = useCatalogProductBySku(stockItem?.sku);
  const { data, status, refetch } = useStockItemAdjustments(stockItem?.id, page);

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setPage(1);
      }}
    >
      <DrawerContent width="lg">
        <DrawerHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DrawerTitle>{stockItem?.sku ?? 'Stock item'}</DrawerTitle>
            {stockItem && <StockHealthBadge item={stockItem} warehouseStatus={warehouse?.status} />}
          </div>
          <DrawerDescription>{product ? product.name : warehouse ? `In ${warehouse.name}` : 'Stock detail'}</DrawerDescription>
        </DrawerHeader>

        {stockItem && (
          <div className="mt-4 rounded-md border border-border p-4">
            <Text variant="caption" className="text-text-secondary">
              Available to sell
            </Text>
            <Text variant="display" as="p" className="tabular-nums leading-tight">
              {stockItem.quantityAvailable}
            </Text>
            <div className="mt-3 flex gap-6 border-t border-border pt-3">
              <div>
                <Text variant="caption" className="text-text-secondary">
                  On hand
                </Text>
                <Text variant="body-strong" as="p" className="tabular-nums">
                  {stockItem.quantityOnHand}
                </Text>
              </div>
              <div>
                <Text variant="caption" className="text-text-secondary">
                  Reserved
                </Text>
                <Text variant="body-strong" as="p" className="tabular-nums">
                  {stockItem.quantityReserved}
                </Text>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex-1 overflow-y-auto">
          <Text variant="body-strong" className="mb-2">
            Recent movement
          </Text>

          {status === 'pending' && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                // eslint-disable-next-line react/no-array-index-key -- skeleton placeholder rows have no stable identity
                <Skeleton key={i} shape="block" className="h-12 w-full" />
              ))}
            </div>
          )}

          {status === 'error' && <ErrorState onRetry={() => void refetch()} />}

          {status === 'success' && (data?.data.length ?? 0) === 0 && (
            <EmptyState
              icon={<History className="size-8" aria-hidden="true" />}
              title="No movement yet"
              description="Adjustments to this stock item will appear here."
            />
          )}

          {status === 'success' && (data?.data.length ?? 0) > 0 && (
            <ol className="flex flex-col gap-3">
              {(data?.data ?? []).map((entry) => (
                <li key={entry.id} className="border-l-2 border-border pl-3">
                  <div className="flex items-center gap-2">
                    <DeltaBadge delta={entry.quantityDelta} />
                    <Text variant="body-strong">{entry.reason}</Text>
                  </div>
                  <Text variant="caption" className="text-text-secondary">
                    {dayGroupLabel(entry.createdAt)}, {shortTime(entry.createdAt)}
                    {entry.actorId && <> · by {entry.actorId.slice(0, 8)}</>}
                  </Text>
                </li>
              ))}
            </ol>
          )}

          {data?.meta?.last_page && data.meta.last_page > 1 && (
            <div className="mt-4">
              <Pagination currentPage={data.meta.current_page ?? page} totalPages={data.meta.last_page} onPageChange={setPage} />
            </div>
          )}
        </div>

        <DrawerFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canManage && (
            <Button type="button" onClick={onAdjust}>
              Adjust stock
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
