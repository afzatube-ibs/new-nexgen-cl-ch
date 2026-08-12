import { useEffect, useMemo, useState } from 'react';
import { Plus, MoreHorizontal, Pencil, Archive, Trash2, Star, Tags, TriangleAlert } from 'lucide-react';
import {
  DataTable,
  type DataTableColumn,
  type DataTableSortState,
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Select,
  Text,
  Card,
  useToast,
} from '@nexgen/ui';
import type { PriceListDTO } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { useAuth } from '../../../auth/useAuth.js';
import { pricingErrorMessage } from '../shared/errors.js';
import { useAllPriceLists, useArchivePriceList, useDestroyPriceList } from './queries.js';
import { PriceListFormDialog } from './PriceListFormDialog.js';
import { PriceListDetailDrawer } from './PriceListDetailDrawer.js';

type StatusFilter = 'all' | 'active' | 'archived';
const PAGE_SIZE = 20;

/**
 * Price Lists — `pricing.price_lists.view` (list/show), `.manage` (create/
 * edit/archive/delete). The Slice 1 landing page: answers "which price
 * list is active, which currency, is it the default, when was it last
 * touched" at a glance, per `planning/reviews/
 * PHASE_2_4_PRICING_ARCHITECTURE_REVIEW.md`'s approved scope.
 *
 * `PriceListController::index` (apps/backend) supports `status`/
 * `currency_code` filters but has a *hardcoded* `orderBy('name')` — no
 * `sort` param is ever read, unlike Catalog's Products. Rather than fake a
 * sort control the backend can't honor, or silently no-op one, this page
 * fetches the complete Price List collection once (`useAllPriceLists` —
 * see that hook's own docblock for why this entity's real-world scale
 * makes that the right call) and implements genuine, complete
 * search/filter/sort/pagination entirely client-side against the full
 * set — every result really is being searched, not just whichever page
 * the server happened to return first.
 *
 * No "Restore" action exists for an archived Price List — deliberately:
 * `planning/reviews/PHASE_2_4_PRICING_ARCHITECTURE_REVIEW.md`'s Task 2
 * found the identical "Restore only undoes soft-delete, never un-archives"
 * gap already fixed once for Inventory's Warehouse, and recommended
 * designing around it here from the start rather than shipping a second
 * misleading button. Offering none is the honest choice until a real
 * platform-wide Archive/Restore decision is made.
 */
export function PriceListsListPage() {
  const { toast } = useToast();
  const { can } = useAuth();
  const canManage = can('pricing.price_lists.manage');

  const { data: allPriceLists, status: queryStatus, refetch } = useAllPriceLists();
  const lists = useMemo(() => allPriceLists ?? [], [allPriceLists]);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [currency, setCurrency] = useState<string>('all');
  const [sort, setSort] = useState<DataTableSortState | null>(null);
  const [page, setPage] = useState(1);

  const currencyOptions = useMemo(() => {
    const codes = Array.from(new Set(lists.map((l) => l.currencyCode))).sort();
    return [{ value: 'all', label: 'All currencies' }, ...codes.map((code) => ({ value: code, label: code }))];
  }, [lists]);

  // Currencies that have at least one Price List but no *default* one —
  // `LookupPriceAction` (and therefore Checkout) can never resolve a price
  // for that currency at all until one is set. A real, high-stakes risk
  // this page surfaces prominently rather than leaving a merchant to
  // discover it as a broken checkout later — see the architecture review's
  // own §9 finding.
  const currenciesMissingDefault = useMemo(() => {
    const byCurrency = new Map<string, PriceListDTO[]>();
    for (const list of lists) {
      if (list.status !== 'active') continue;
      const bucket = byCurrency.get(list.currencyCode) ?? [];
      bucket.push(list);
      byCurrency.set(list.currencyCode, bucket);
    }
    return Array.from(byCurrency.entries())
      .filter(([, group]) => !group.some((l) => l.isDefault))
      .map(([code]) => code);
  }, [lists]);

  const filtered = useMemo(() => {
    let result = lists;
    if (status !== 'all') result = result.filter((l) => l.status === status);
    if (currency !== 'all') result = result.filter((l) => l.currencyCode === currency);
    const term = search.trim().toLowerCase();
    if (term) result = result.filter((l) => l.name.toLowerCase().includes(term) || l.currencyCode.toLowerCase().includes(term));
    if (sort) {
      const dir = sort.direction === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        switch (sort.columnId) {
          case 'name':
            return a.name.localeCompare(b.name) * dir;
          case 'currency':
            return a.currencyCode.localeCompare(b.currencyCode) * dir;
          case 'status':
            return a.status.localeCompare(b.status) * dir;
          case 'updated':
            return ((a.updatedAt ?? '') < (b.updatedAt ?? '') ? -1 : 1) * dir;
          default:
            return 0;
        }
      });
    }
    return result;
  }, [lists, status, currency, search, sort]);

  useEffect(() => setPage(1), [search, status, currency, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const archiveMutation = useArchivePriceList();
  const destroyMutation = useDestroyPriceList();

  const [formOpen, setFormOpen] = useState(false);
  const [editingList, setEditingList] = useState<PriceListDTO | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | undefined>(undefined);
  const [detailOpen, setDetailOpen] = useState(false);

  function openDetail(row: PriceListDTO): void {
    setDetailId(row.id);
    setDetailOpen(true);
  }

  async function handleArchive(row: PriceListDTO): Promise<void> {
    try {
      await archiveMutation.mutateAsync({ id: row.id, expectedVersion: row.version });
      toast({ variant: 'success', title: 'Price list archived', description: `"${row.name}" is now archived.` });
    } catch (error) {
      toast({ variant: 'danger', title: "Couldn't archive price list", description: pricingErrorMessage(error) });
    }
  }

  const columns: DataTableColumn<PriceListDTO>[] = useMemo(() => {
    const cols: DataTableColumn<PriceListDTO>[] = [
      {
        id: 'name',
        header: 'Name',
        sortable: true,
        cell: (row) => (
          <div className="flex items-center gap-2">
            <Text variant="body-strong">{row.name}</Text>
            {row.isDefault && (
              // Solid (not tinted) treatment — the default `info`/`success`
              // variants measure 2.85–4.13:1 against the 4.5:1 WCAG AA floor
              // at caption text size, the exact contrast failure already
              // found and fixed once for Inventory's own Badge usages
              // (`TransferStatusBadge`'s own docblock); applied here from
              // the start rather than rediscovering it a third time.
              <Badge className="gap-1 bg-feedback-info text-black">
                <Star className="size-3" aria-hidden="true" /> Default
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: 'currency',
        header: 'Currency',
        sortable: true,
        cell: (row) => (
          <Text variant="body" className="tabular-nums">
            {row.currencyCode}
          </Text>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        sortable: true,
        cell: (row) => <Badge className={row.status === 'active' ? 'bg-feedback-success text-black' : undefined}>{row.status}</Badge>,
      },
      {
        id: 'updated',
        header: 'Updated',
        sortable: true,
        cell: (row) => (row.updatedAt ? new Date(row.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'),
      },
    ];
    cols.push({
      id: 'actions',
      header: '',
      className: 'w-10',
      cell: (row) => (
        <RequirePermission anyOf={['pricing.price_lists.manage']} inline={null}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label={`Actions for ${row.name}`} onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onSelect={() => {
                  setEditingList(row);
                  setFormOpen(true);
                }}
              >
                <Pencil className="size-4" /> Edit
              </DropdownMenuItem>
              {row.status === 'active' && (
                <DropdownMenuItem onSelect={() => void handleArchive(row)}>
                  <Archive className="size-4" /> Archive
                </DropdownMenuItem>
              )}
              <ConfirmDialog
                trigger={
                  <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                }
                title="Delete this price list?"
                description={`"${row.name}" and every price it holds will be permanently deleted. This cannot be undone.`}
                confirmLabel="Delete"
                destructive
                onConfirm={() => destroyMutation.mutateAsync({ id: row.id, expectedVersion: row.version })}
                getErrorMessage={pricingErrorMessage}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </RequirePermission>
      ),
    });
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleArchive/destroyMutation are stable enough for this list's own lifetime
  }, [destroyMutation]);

  return (
    <div>
      {lists.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <Text variant="caption" className="text-text-secondary">
              Price lists
            </Text>
            <Text variant="heading" className="tabular-nums">
              {lists.length}
            </Text>
          </Card>
          <Card className="p-4">
            <Text variant="caption" className="text-text-secondary">
              Currencies covered
            </Text>
            <Text variant="heading" className="tabular-nums">
              {currencyOptions.length - 1}
            </Text>
          </Card>
          <Card className={`p-4 ${currenciesMissingDefault.length > 0 ? 'border-feedback-warning' : ''}`}>
            <Text variant="caption" className="text-text-secondary">
              Missing a default
            </Text>
            <div className="flex items-center gap-1.5">
              {currenciesMissingDefault.length > 0 && <TriangleAlert className="size-4 text-feedback-warning" aria-hidden="true" />}
              <Text variant="heading" className="tabular-nums">
                {currenciesMissingDefault.length}
              </Text>
            </div>
            {currenciesMissingDefault.length > 0 && (
              <Text variant="caption" className="text-text-secondary">
                {currenciesMissingDefault.join(', ')} — Checkout can&rsquo;t price anything in{' '}
                {currenciesMissingDefault.length === 1 ? 'this currency' : 'these currencies'} until a default is set.
              </Text>
            )}
          </Card>
        </div>
      )}

      <CrudPageLayout
        header={{
          title: 'Price Lists',
          description: 'Base pricing by currency — Checkout resolves every price from each currency’s default list.',
          actions: (
            <RequirePermission anyOf={['pricing.price_lists.manage']} inline={null}>
              <Button
                onClick={() => {
                  setEditingList(undefined);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" /> New price list
              </Button>
            </RequirePermission>
          ),
        }}
        toolbar={
          <Toolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name or currency…"
            filters={
              <FilterBar
                active={[
                  ...(status === 'all' ? [] : [{ key: 'status', label: 'Status', displayValue: status }]),
                  ...(currency === 'all' ? [] : [{ key: 'currency', label: 'Currency', displayValue: currency }]),
                ]}
                onRemove={(key) => {
                  if (key === 'status') setStatus('all');
                  if (key === 'currency') setCurrency('all');
                }}
              >
                <Select
                  label="Status"
                  value={status}
                  onValueChange={(v) => setStatus(v as StatusFilter)}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'active', label: 'Active' },
                    { value: 'archived', label: 'Archived' },
                  ]}
                />
                <Select label="Currency" value={currency} onValueChange={setCurrency} options={currencyOptions} />
              </FilterBar>
            }
          />
        }
        pagination={filtered.length > PAGE_SIZE ? { currentPage: page, totalPages, onPageChange: setPage } : undefined}
      >
        <DataTable
          columns={columns}
          data={pageItems}
          getRowId={(row) => row.id}
          onRowClick={openDetail}
          sort={sort}
          onSortChange={setSort}
          status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={
            status !== 'all' || currency !== 'all' || search.trim()
              ? {
                  icon: <Tags className="size-8" aria-hidden="true" />,
                  title: 'No matching price lists',
                  description: 'No price lists match the current filter or search.',
                }
              : {
                  icon: <Tags className="size-8" aria-hidden="true" />,
                  title: 'No price lists yet',
                  description: canManage
                    ? 'Create a price list for each currency you sell in — Checkout needs a default one to price anything.'
                    : 'No price lists have been created yet.',
                  action: canManage
                    ? {
                        label: 'New price list',
                        onClick: () => {
                          setEditingList(undefined);
                          setFormOpen(true);
                        },
                      }
                    : undefined,
                }
          }
        />
      </CrudPageLayout>

      <PriceListFormDialog open={formOpen} onOpenChange={setFormOpen} priceList={editingList} />
      <PriceListDetailDrawer open={detailOpen} onOpenChange={setDetailOpen} priceListId={detailId} />
    </div>
  );
}
