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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@nexgen/ui';
import type { StockItemDTO, WarehouseDTO } from '@nexgen/api-client';
import { useCatalogProductBySku } from '../shared/catalogLookup.js';
import { StockHealthBadge } from '../shared/StockHealthBadge.js';
import { DeltaBadge } from '../shared/DeltaBadge.js';
import { dayGroupLabel, shortTime } from '../shared/formatTimestamp.js';
import { useStockItemAdjustments } from './queries.js';
import { ReservationsPanel } from './ReservationsPanel.js';

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
 * on-hand/reserved/available breakdown, its real per-item adjustment ledger
 * (`GET /stock-items/{id}/adjustments`), and — Slice 2 — its real
 * reservations (`GET /stock-items/{id}/reservations`), as two tabs rather
 * than one long scroll: "Movement" answers "why did the count change,"
 * "Reservations" answers "what's held right now and is action needed."
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
          <>
            {/* Each direct child of <dl> is its own div containing exactly one
                dt followed by one dd — the valid grouped form the HTML spec
                allows, laid out with grid instead of a nested flex wrapper so
                the markup stays spec-conformant (a screen reader's term/value
                announcement shouldn't depend on an extra, invalid div level). */}
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 rounded-md border border-border p-4">
              <div className="col-span-2">
                <Text as="dt" variant="caption" className="text-text-secondary">
                  Available to sell
                </Text>
                <Text as="dd" variant="display" className="m-0 tabular-nums leading-tight">
                  {stockItem.quantityAvailable}
                </Text>
              </div>
              <div className="border-t border-border pt-3">
                <Text as="dt" variant="caption" className="text-text-secondary">
                  On hand
                </Text>
                <Text as="dd" variant="body-strong" className="m-0 tabular-nums">
                  {stockItem.quantityOnHand}
                </Text>
              </div>
              <div className="border-t border-border pt-3">
                <Text as="dt" variant="caption" className="text-text-secondary">
                  Reserved
                </Text>
                <Text as="dd" variant="body-strong" className="m-0 tabular-nums">
                  {stockItem.quantityReserved}
                </Text>
              </div>
            </dl>
            {/* Spells out the relationship instead of leaving merchants to do
                the subtraction themselves every time — supplementary caption,
                not a term/value pair, so it sits outside the <dl>. */}
            <Text variant="caption" className="mt-2 text-text-secondary">
              On hand − Reserved = Available
            </Text>
          </>
        )}

        <div className="mt-6 flex-1 overflow-y-auto">
          {stockItem && (
            <Tabs defaultValue="movement">
              <TabsList>
                <TabsTrigger value="movement">Movement</TabsTrigger>
                <TabsTrigger value="reservations">Reservations</TabsTrigger>
              </TabsList>

              <TabsContent value="movement">
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
              </TabsContent>

              <TabsContent value="reservations">
                <ReservationsPanel stockItem={stockItem} canManage={canManage} />
              </TabsContent>
            </Tabs>
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
