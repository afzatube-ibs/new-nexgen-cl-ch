import { useMemo } from 'react';
import { CircleCheck, TriangleAlert, Coins } from 'lucide-react';
import { DataTable, type DataTableColumn, Text } from '@nexgen/ui';
import type { PriceListDTO } from '@nexgen/api-client';
import { PageHeader } from '../../../framework/index.js';
import { usePriceListsWithEntries } from './queries.js';

interface CurrencyCoverageRow {
  currencyCode: string;
  totalLists: number;
  activeLists: number;
  defaultListName: string | null;
  pricedSkuCount: number;
  lastUpdated: string | null;
}

/**
 * Currency Coverage — `pricing.price_lists.view`. Per-currency rollup: how
 * many price lists exist, whether an active default is set (the exact
 * condition `LookupPriceAction`/Checkout require to price anything in that
 * currency at all — `PriceListsListPage`'s own "Missing a default" KPI,
 * expanded here into its own dedicated, full-detail view per currency), how
 * many SKUs are actually priced in the default list, and when it was last
 * touched.
 *
 * Scoped to currencies that have at least one Price List — not every ISO
 * 4217 currency the platform could theoretically validate. Which
 * currencies a store intends to sell in isn't Pricing's own concern (Store
 * Configuration's), so inventing a coverage gap for a currency with no
 * Price List at all would be speculating about a decision this module
 * doesn't own.
 */
export function CurrencyCoveragePage() {
  const { data: priceLists, isLoading, isError, refetch } = usePriceListsWithEntries();

  const rows = useMemo<CurrencyCoverageRow[]>(() => {
    const byCurrency = new Map<string, PriceListDTO[]>();
    for (const list of priceLists ?? []) {
      const bucket = byCurrency.get(list.currencyCode) ?? [];
      bucket.push(list);
      byCurrency.set(list.currencyCode, bucket);
    }
    return Array.from(byCurrency.entries())
      .map(([currencyCode, group]) => {
        const activeGroup = group.filter((l) => l.status === 'active');
        const defaultList = activeGroup.find((l) => l.isDefault);
        const lastUpdated = group.reduce<string | null>((latest, l) => {
          if (!l.updatedAt) return latest;
          return !latest || l.updatedAt > latest ? l.updatedAt : latest;
        }, null);
        return {
          currencyCode,
          totalLists: group.length,
          activeLists: activeGroup.length,
          defaultListName: defaultList ? defaultList.name : null,
          pricedSkuCount: defaultList?.entries?.length ?? 0,
          lastUpdated,
        };
      })
      .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
  }, [priceLists]);

  const columns: DataTableColumn<CurrencyCoverageRow>[] = [
    { id: 'currency', header: 'Currency', cell: (row) => <Text variant="body-strong">{row.currencyCode}</Text> },
    {
      id: 'lists',
      header: 'Price lists',
      cell: (row) => (
        <span className="tabular-nums">
          {row.activeLists} active{row.totalLists !== row.activeLists ? ` · ${row.totalLists - row.activeLists} archived` : ''}
        </span>
      ),
    },
    {
      id: 'default',
      header: 'Default',
      cell: (row) =>
        row.defaultListName ? (
          <div className="flex items-center gap-1.5">
            <CircleCheck className="size-4 text-feedback-success" aria-hidden="true" />
            <Text variant="body">{row.defaultListName}</Text>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-feedback-warning">
            <TriangleAlert className="size-4" aria-hidden="true" />
            <Text variant="body">None — Checkout can&rsquo;t price this currency</Text>
          </div>
        ),
    },
    {
      id: 'priced',
      header: 'SKUs priced',
      cell: (row) => (row.defaultListName ? <span className="tabular-nums">{row.pricedSkuCount}</span> : <span className="text-text-secondary">—</span>),
    },
    {
      id: 'updated',
      header: 'Last updated',
      cell: (row) => (row.lastUpdated ? new Date(row.lastUpdated).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Currency Coverage"
        description="Every currency with at least one price list, and whether Checkout can actually price anything in it."
      />

      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.currencyCode}
        status={isLoading ? 'loading' : isError ? 'error' : 'success'}
        onRetry={() => refetch()}
        emptyState={{
          icon: <Coins className="size-8" aria-hidden="true" />,
          title: 'No price lists yet',
          description: 'Create a price list for a currency to see its coverage here — see Price Lists.',
        }}
      />
    </div>
  );
}
