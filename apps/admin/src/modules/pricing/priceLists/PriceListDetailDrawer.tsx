import { useEffect, useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Pencil, Trash2, Tag, DollarSign } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  Button,
  Badge,
  DataTable,
  type DataTableColumn,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Text,
  Skeleton,
  ErrorState,
  Pagination,
} from '@nexgen/ui';
import type { PriceListEntryDTO } from '@nexgen/api-client';
import { ConfirmDialog, RequirePermission, Toolbar } from '../../../framework/index.js';
import { useCatalogProductBySku } from '../shared/catalogLookup.js';
import { pricingErrorMessage } from '../shared/errors.js';
import { formatCurrency } from '../shared/formatCurrency.js';
import { usePriceList, useDestroyPriceListEntry } from './queries.js';
import { PriceListEntryFormDialog } from './PriceListEntryFormDialog.js';

const PAGE_SIZE = 20;

function ProductCell({ sku }: { sku: string }) {
  const { data: product, isFetching } = useCatalogProductBySku(sku);
  return (
    <div>
      <Text variant="body-strong" className="tabular-nums">
        {sku}
      </Text>
      <Text variant="caption" className="text-text-secondary">
        {isFetching ? 'Checking Catalog…' : (product?.name ?? 'Not in Catalog')}
      </Text>
    </div>
  );
}

function SaleCell({ entry, currencyCode }: { entry: PriceListEntryDTO; currencyCode: string }) {
  if (!entry.salePrice) return <span className="text-text-secondary">—</span>;
  const scheduled = !entry.isSaleActive && (entry.saleStartsAt || entry.saleEndsAt);
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <Text variant="body">{formatCurrency(entry.salePrice, currencyCode)}</Text>
        {entry.isSaleActive ? (
          // Solid, not tinted — see PriceListsListPage's own docblock note
          // on this exact WCAG AA contrast failure already found once for
          // Inventory's Badge usages.
          <Badge className="bg-feedback-success text-black">On sale</Badge>
        ) : scheduled ? (
          <Badge>Scheduled</Badge>
        ) : (
          <Badge>Not active</Badge>
        )}
      </div>
      {(entry.saleStartsAt || entry.saleEndsAt) && (
        <Text variant="caption" className="text-text-secondary">
          {entry.saleStartsAt ? new Date(entry.saleStartsAt).toLocaleDateString() : 'Any time'} –{' '}
          {entry.saleEndsAt ? new Date(entry.saleEndsAt).toLocaleDateString() : 'no end'}
        </Text>
      )}
    </div>
  );
}

export interface PriceListDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceListId: string | undefined;
}

/**
 * A Price List's own detail — its real, currently-priced SKUs. No
 * top-level route exists for this (no cross-list entry endpoint to justify
 * one — `packages/api-client/src/pricing/priceListEntries.ts`'s own
 * docblock), the identical shape that put Inventory's own Stock
 * Reservations in a drawer rather than a page in Slice 2.
 *
 * `PriceListController::show` loads every entry in one, unpaginated
 * response (`$priceList->load('entries')`) — there is no server-side
 * page/search/sort for entries at all. This drawer fetches that complete
 * set once and implements genuine client-side search/sort/pagination
 * against all of it, the same reasoning `shared/pagination.ts` documents
 * for the parent list. At real "thousands of products in one list" scale
 * this single unpaginated fetch is the one place in this slice that
 * doesn't scale gracefully — a real backend constraint, not something this
 * slice invented or can fix without a new endpoint (out of scope per
 * `planning/reviews/PHASE_2_4_PRICING_ARCHITECTURE_REVIEW.md`'s own strict
 * rules) — flagged honestly here and in the Slice 1 report rather than
 * hidden.
 */
export function PriceListDetailDrawer({ open, onOpenChange, priceListId }: PriceListDetailDrawerProps) {
  const { data: priceList, status, refetch } = usePriceList(priceListId);
  const destroyMutation = useDestroyPriceListEntry(priceListId ?? '');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PriceListEntryDTO | undefined>(undefined);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setPage(1);
      setEditingEntry(undefined);
    }
  }, [open]);

  const allEntries = useMemo(() => priceList?.entries ?? [], [priceList]);
  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allEntries;
    return allEntries.filter((e) => e.sku.toLowerCase().includes(term));
  }, [allEntries, search]);

  useEffect(() => setPage(1), [search]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const pageEntries = filteredEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openAddEntry(): void {
    setEditingEntry(undefined);
    setEntryFormOpen(true);
  }

  function openEditEntry(entry: PriceListEntryDTO): void {
    setEditingEntry(entry);
    setEntryFormOpen(true);
  }

  const columns: DataTableColumn<PriceListEntryDTO>[] = useMemo(
    () => [
      { id: 'sku', header: 'Product', cell: (row) => <ProductCell sku={row.sku} /> },
      {
        id: 'basePrice',
        header: 'Base price',
        cell: (row) => <span className="tabular-nums">{formatCurrency(row.basePrice, priceList?.currencyCode ?? 'USD')}</span>,
      },
      {
        id: 'compareAtPrice',
        header: 'Compare at',
        cell: (row) => (
          <span className="tabular-nums text-text-secondary">
            {row.compareAtPrice ? formatCurrency(row.compareAtPrice, priceList?.currencyCode ?? 'USD') : '—'}
          </span>
        ),
      },
      { id: 'sale', header: 'Sale', cell: (row) => <SaleCell entry={row} currencyCode={priceList?.currencyCode ?? 'USD'} /> },
      {
        id: 'updated',
        header: 'Updated',
        cell: (row) => (row.updatedAt ? new Date(row.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'),
      },
      {
        id: 'actions',
        header: '',
        className: 'w-10',
        cell: (row) => (
          <RequirePermission anyOf={['pricing.price_lists.manage']} inline={null}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label={`Actions for ${row.sku}`} onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onSelect={() => openEditEntry(row)}>
                  <Pencil className="size-4" /> Edit
                </DropdownMenuItem>
                <ConfirmDialog
                  trigger={
                    <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  }
                  title="Remove this price?"
                  description={`${row.sku} will no longer have a price in ${priceList?.name ?? 'this list'}. This cannot be undone.`}
                  confirmLabel="Delete"
                  destructive
                  onConfirm={() => destroyMutation.mutateAsync({ entryId: row.id, expectedVersion: row.version })}
                  getErrorMessage={pricingErrorMessage}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </RequirePermission>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- destroyMutation is stable enough for this drawer's own lifetime
    [priceList?.currencyCode, priceList?.name],
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent width="lg">
        <DrawerHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DrawerTitle>{priceList?.name ?? 'Price list'}</DrawerTitle>
            {priceList && (
              <>
                <Badge variant="outline">{priceList.currencyCode}</Badge>
                {priceList.isDefault && <Badge className="bg-feedback-info text-black">Default</Badge>}
                <Badge className={priceList.status === 'active' ? 'bg-feedback-success text-black' : undefined}>{priceList.status}</Badge>
              </>
            )}
          </div>
          <DrawerDescription>
            {priceList
              ? `${allEntries.length} SKU${allEntries.length === 1 ? '' : 's'} priced${
                  priceList.updatedAt ? ` · Updated ${new Date(priceList.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}` : ''
                }`
              : 'Loading…'}
          </DrawerDescription>
        </DrawerHeader>

        <div className="mt-4 flex-1 overflow-y-auto">
          {status === 'pending' && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                // eslint-disable-next-line react/no-array-index-key -- skeleton placeholder rows have no stable identity
                <Skeleton key={i} shape="block" className="h-14 w-full" />
              ))}
            </div>
          )}

          {status === 'error' && <ErrorState onRetry={() => void refetch()} />}

          {status === 'success' && priceList && (
            <>
              <Toolbar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search SKU…"
                actions={
                  <RequirePermission anyOf={['pricing.price_lists.manage']} inline={null}>
                    <Button size="sm" onClick={openAddEntry}>
                      <Plus className="size-4" /> Add price
                    </Button>
                  </RequirePermission>
                }
              />

              <DataTable
                columns={columns}
                data={pageEntries}
                getRowId={(row) => row.id}
                status="success"
                emptyState={
                  search.trim()
                    ? { icon: <Tag className="size-8" aria-hidden="true" />, title: 'No matching SKUs', description: 'No priced SKU matches this search.' }
                    : {
                        icon: <DollarSign className="size-8" aria-hidden="true" />,
                        title: 'No prices yet',
                        description: 'Add a price to start selling in this list.',
                        action: { label: 'Add price', onClick: openAddEntry },
                      }
                }
              />

              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </div>

        <DrawerFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>

      {priceList && <PriceListEntryFormDialog open={entryFormOpen} onOpenChange={setEntryFormOpen} priceList={priceList} entry={editingEntry} />}
    </Drawer>
  );
}
