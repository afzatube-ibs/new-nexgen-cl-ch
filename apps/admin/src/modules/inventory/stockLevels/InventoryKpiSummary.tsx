import { useMemo } from 'react';
import { Warehouse as WarehouseIcon, Boxes, AlertTriangle, XCircle, PackageCheck } from 'lucide-react';
import { Card, Text, Skeleton } from '@nexgen/ui';
import type { StockItemDTO, WarehouseDTO } from '@nexgen/api-client';
import { stockHealth } from '../shared/stockHealth.js';

export interface InventoryKpiSummaryProps {
  warehouseCount: number | undefined;
  /** `meta.total` from the current (possibly filtered) Stock Items query — a real backend count, not computed client-side. */
  totalStockItems: number | undefined;
  /** The currently-loaded page of Stock Items — Low Stock / Out of Stock / Available are tallied from this only (see the "(this page)" labels below) and never by fetching every page, which would not be a safe pattern at real SKU volume. */
  pageItems: StockItemDTO[];
  warehouseById: Map<string, WarehouseDTO>;
  loading: boolean;
}

interface Kpi {
  key: string;
  icon: typeof WarehouseIcon;
  label: string;
  value: number | undefined;
  tone?: 'warning' | 'danger';
}

/**
 * "Do not invent backend calculations" — every number here is either a real
 * value the backend already returns (`Warehouses`, `Stock items` — both
 * from list `meta.total`/count, never estimated) or an honest, clearly
 * page-scoped tally (`Low stock`/`Out of stock`/`Available` — labeled
 * "this page", not a false claim of a global count the backend has no
 * endpoint to provide yet; see `planning/architecture/
 * PHASE_2_3_INVENTORY_ARCHITECTURE.md` §9).
 */
export function InventoryKpiSummary({ warehouseCount, totalStockItems, pageItems, warehouseById, loading }: InventoryKpiSummaryProps) {
  const { outOfStock, lowStock, available } = useMemo(() => {
    let outOfStock = 0;
    let lowStock = 0;
    let available = 0;
    for (const item of pageItems) {
      const health = stockHealth(item, warehouseById.get(item.warehouseId)?.status);
      if (health.status === 'out_of_stock') outOfStock++;
      else if (health.status === 'low_stock') lowStock++;
      available += item.quantityAvailable;
    }
    return { outOfStock, lowStock, available };
  }, [pageItems, warehouseById]);

  const kpis: Kpi[] = [
    { key: 'warehouses', icon: WarehouseIcon, label: 'Warehouses', value: warehouseCount },
    { key: 'stock-items', icon: Boxes, label: 'Stock items', value: totalStockItems },
    { key: 'low-stock', icon: AlertTriangle, label: 'Low stock (this page)', value: lowStock, tone: lowStock > 0 ? 'warning' : undefined },
    { key: 'out-of-stock', icon: XCircle, label: 'Out of stock (this page)', value: outOfStock, tone: outOfStock > 0 ? 'danger' : undefined },
    { key: 'available', icon: PackageCheck, label: 'Available (this page)', value: available },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" role="group" aria-label="Inventory summary">
      {kpis.map((kpi) => (
        <Card key={kpi.key} className="flex items-center gap-3 p-4">
          <div
            className={
              'flex size-9 shrink-0 items-center justify-center rounded-md ' +
              (kpi.tone === 'danger'
                ? 'bg-feedback-danger/10 text-feedback-danger'
                : kpi.tone === 'warning'
                  ? 'bg-feedback-warning/10 text-feedback-warning'
                  : 'bg-surface-subtle text-text-secondary')
            }
          >
            <kpi.icon className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            {loading ? (
              <Skeleton shape="text" className="h-6 w-10" />
            ) : (
              <Text variant="heading" as="p" className="leading-none">
                {kpi.value ?? '—'}
              </Text>
            )}
            <Text variant="caption" className="mt-1 truncate text-text-secondary">
              {kpi.label}
            </Text>
          </div>
        </Card>
      ))}
    </div>
  );
}
