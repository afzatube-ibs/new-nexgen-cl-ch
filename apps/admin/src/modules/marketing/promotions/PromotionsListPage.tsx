import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Pencil, Archive, Trash2 } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Badge, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Select, Text } from '@nexgen/ui';
import type { PromotionDTO, DiscountType, PromotionStatus } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { marketingErrorMessage } from '../shared/errors.js';
import { usePromotions, useArchivePromotion, useDestroyPromotion } from './queries.js';
import { PromotionFormDialog } from './PromotionFormDialog.js';

type StatusFilter = 'all' | PromotionStatus;
type TypeFilter = 'all' | DiscountType;

const DISCOUNT_TYPE_LABEL: Record<DiscountType, string> = {
  percentage: 'Percentage',
  fixed_amount: 'Fixed amount',
  buy_x_get_y: 'Buy X get Y',
  free_shipping: 'Free shipping',
};

/**
 * Promotions List — `PromotionController::index`, `promotions.promotions.
 * view`. Real, server-side `status`/`discount_type` filters only, confirmed
 * by reading the controller directly — no free-text search on this real
 * backend. `priority desc, name` ordering is server-hardcoded, no override
 * — matches the identical constraint every other module's own hardcoded-
 * order list already documents. The search box below therefore filters
 * client-side over the currently-loaded page only, labeled accordingly
 * (mirrors Catalog's own Brands List precedent for the identical
 * search-less-backend constraint).
 */
export function PromotionsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [discountType, setDiscountType] = useState<TypeFilter>('all');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => setPage(1), [status, discountType]);

  const { data, status: queryStatus, refetch } = usePromotions({
    status: status === 'all' ? undefined : status,
    discountType: discountType === 'all' ? undefined : discountType,
    page,
  });
  const allPromotions = useMemo(() => data?.data ?? [], [data]);
  const promotions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allPromotions;
    return allPromotions.filter((p) => p.name.toLowerCase().includes(term));
  }, [allPromotions, search]);

  const archiveMutation = useArchivePromotion();
  const destroyMutation = useDestroyPromotion();

  const columns: DataTableColumn<PromotionDTO>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        cell: (row) => (
          <div>
            <Text variant="body-strong">{row.name}</Text>
            {row.requiresCoupon && (
              <Text variant="caption" className="text-text-secondary">
                Requires coupon
              </Text>
            )}
          </div>
        ),
      },
      { id: 'discountType', header: 'Discount', cell: (row) => DISCOUNT_TYPE_LABEL[row.discountType] },
      { id: 'priority', header: 'Priority', cell: (row) => row.priority },
      {
        id: 'usage',
        header: 'Usage',
        cell: (row) => (row.usageLimitGlobal ? `${row.usageCountGlobal} / ${row.usageLimitGlobal}` : `${row.usageCountGlobal}`),
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => <Badge variant={row.status === 'active' ? 'success' : 'default'}>{row.status}</Badge>,
      },
      {
        id: 'actions',
        header: '',
        className: 'w-10',
        cell: (row) => (
          <RequirePermission anyOf={['promotions.promotions.manage']} inline={null}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label={`Actions for ${row.name}`} onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onSelect={() => void navigate(`/marketing/promotions/${row.id}`)}>
                  <Pencil className="size-4" /> View / edit
                </DropdownMenuItem>
                {row.status === 'active' && (
                  <ConfirmDialog
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Archive className="size-4" /> Archive
                      </DropdownMenuItem>
                    }
                    title="Archive this promotion?"
                    description="It will stop applying at Checkout. This can't be undone — there's no restore for promotions on this backend."
                    confirmLabel="Archive"
                    onConfirm={async () => {
                      await archiveMutation.mutateAsync({ id: row.id, expectedVersion: row.version });
                    }}
                    getErrorMessage={marketingErrorMessage}
                  />
                )}
                <ConfirmDialog
                  trigger={
                    <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  }
                  title="Delete this promotion?"
                  description={`"${row.name}" will be permanently deleted, along with its conditions and coupons. This cannot be undone.`}
                  confirmLabel="Delete"
                  destructive
                  onConfirm={() => destroyMutation.mutateAsync({ id: row.id, expectedVersion: row.version })}
                  getErrorMessage={marketingErrorMessage}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </RequirePermission>
        ),
      },
    ],
    [navigate, archiveMutation, destroyMutation],
  );

  return (
    <div>
      <CrudPageLayout
        header={{
          title: 'Promotions',
          description: 'Discount rules applied at Checkout — percentage, fixed-amount, buy-X-get-Y, and free-shipping offers.',
          actions: (
            <RequirePermission anyOf={['promotions.promotions.manage']} inline={null}>
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="size-4" /> New promotion
              </Button>
            </RequirePermission>
          ),
        }}
        toolbar={
          <Toolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Filter this page…"
            filters={
              <FilterBar
                active={[
                  ...(status === 'all' ? [] : [{ key: 'status', label: 'Status', displayValue: status }]),
                  ...(discountType === 'all' ? [] : [{ key: 'discountType', label: 'Discount', displayValue: DISCOUNT_TYPE_LABEL[discountType] }]),
                ]}
                onRemove={(key) => (key === 'status' ? setStatus('all') : setDiscountType('all'))}
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
                <Select
                  label="Discount type"
                  value={discountType}
                  onValueChange={(v) => setDiscountType(v as TypeFilter)}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'percentage', label: 'Percentage' },
                    { value: 'fixed_amount', label: 'Fixed amount' },
                    { value: 'buy_x_get_y', label: 'Buy X get Y' },
                    { value: 'free_shipping', label: 'Free shipping' },
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
        <DataTable
          columns={columns}
          data={promotions}
          getRowId={(row) => row.id}
          status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          onRowClick={(row) => void navigate(`/marketing/promotions/${row.id}`)}
          emptyState={{ title: 'No promotions yet', description: 'Create your first promotion to offer a discount at Checkout.' }}
        />
      </CrudPageLayout>

      <PromotionFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
