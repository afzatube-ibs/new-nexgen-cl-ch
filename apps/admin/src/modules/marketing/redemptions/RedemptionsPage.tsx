import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Ticket, Eye } from 'lucide-react';
import { DataTable, type DataTableColumn, Text, Input, Button } from '@nexgen/ui';
import type { PromotionRedemptionDTO } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, RequirePermission } from '../../../framework/index.js';
import { usePromotionRedemptions } from './queries.js';
import { formatDecimal } from '../shared/formatDecimal.js';

const PAGE_SIZE = 25;

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * Redemption history — `promotions.redemptions.view`, `GET /promotions/
 * redemptions` (`PromotionRedemptionController::index`). Read-only: every
 * real row is created exclusively by Checkout's own `SubmitCheckoutAction`
 * calling `RedeemPromotionAction` directly at order placement — there is
 * no admin-facing "Redeem" action anywhere in this module, per `PHASE_3_0_
 * MARKETING_ARCHITECTURE.md` §4/§9. The real backend filters are
 * `promotion_id`/`customer_id` only, confirmed by reading the controller
 * directly — both entered as plain id text here (no picker), the same
 * honest scope limit `PromotionConditionDialog` already documents.
 */
export function RedemptionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Supports a real deep-link from `PromotionRedemptionTimeline`'s own
  // "View all" link — mirrors Orders List's own `customer_id` URL-param
  // precedent (`OrdersListPage.tsx`) rather than inventing a new pattern.
  const [promotionId, setPromotionId] = useState(searchParams.get('promotion_id') ?? '');
  const [customerId, setCustomerId] = useState('');
  const [page, setPage] = useState(1);

  const { data, status, refetch } = usePromotionRedemptions({
    promotionId: promotionId.trim() || undefined,
    customerId: customerId.trim() || undefined,
    page,
    perPage: PAGE_SIZE,
  });
  const redemptions = useMemo(() => data?.data ?? [], [data]);

  useEffect(() => setPage(1), [promotionId, customerId]);

  const columns: DataTableColumn<PromotionRedemptionDTO>[] = [
    { id: 'when', header: 'Redeemed', cell: (row) => <span className="tabular-nums">{formatDateTime(row.redeemedAt)}</span> },
    { id: 'promotion', header: 'Promotion', cell: (row) => <span className="font-mono text-caption">{row.promotionId.slice(0, 8)}</span> },
    { id: 'coupon', header: 'Coupon', cell: (row) => (row.couponId ? <span className="font-mono text-caption">{row.couponId.slice(0, 8)}</span> : '—') },
    {
      id: 'customer',
      header: 'Customer',
      cell: (row) =>
        row.customerId ? (
          <RequirePermission
            anyOf={['customers.customers.view']}
            inline={<span className="font-mono text-caption">{row.customerId.slice(0, 8)}</span>}
          >
            <button
              type="button"
              className="font-mono text-caption text-brand-primary hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                void navigate(`/customers/${row.customerId}`);
              }}
            >
              {row.customerId.slice(0, 8)}
            </button>
          </RequirePermission>
        ) : (
          'Guest'
        ),
    },
    // `order_reference` is a plain, caller-supplied string with no relation
    // to Orders at all (confirmed by reading the migration's own docblock
    // directly) — never a "View order" link, since that would invent a
    // cross-module relationship this backend deliberately does not have.
    { id: 'order', header: 'Order reference', cell: (row) => (row.orderReference ? <span className="font-mono text-caption">{row.orderReference}</span> : '—') },
    { id: 'discount', header: 'Discount', cell: (row) => <Text variant="body-strong">{`${formatDecimal(row.discountAmount)} ${row.currencyCode}`}</Text> },
    {
      id: 'actions',
      header: '',
      className: 'w-10',
      cell: (row) => (
        <RequirePermission anyOf={['promotions.promotions.view']} inline={null}>
          <Button
            variant="ghost"
            size="sm"
            aria-label="View promotion"
            onClick={(e) => {
              e.stopPropagation();
              void navigate(`/marketing/promotions/${row.promotionId}`);
            }}
          >
            <Eye className="size-4" />
          </Button>
        </RequirePermission>
      ),
    },
  ];

  return (
    <div>
      <CrudPageLayout
        header={{ title: 'Redemptions', description: 'Every real application of a promotion or coupon at Checkout — read-only history.' }}
        toolbar={
          <Toolbar
            filters={
              <FilterBar
                active={[
                  ...(promotionId ? [{ key: 'promotionId', label: 'Promotion', displayValue: promotionId.slice(0, 8) }] : []),
                  ...(customerId ? [{ key: 'customerId', label: 'Customer', displayValue: customerId.slice(0, 8) }] : []),
                ]}
                onRemove={(key) => (key === 'promotionId' ? setPromotionId('') : setCustomerId(''))}
              >
                <Input label="Promotion id" placeholder="Paste a promotion id" value={promotionId} onChange={(e) => setPromotionId(e.target.value)} />
                <Input label="Customer id" placeholder="Paste a customer id" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
              </FilterBar>
            }
          />
        }
        pagination={data?.meta?.last_page ? { currentPage: data.meta.current_page ?? page, totalPages: data.meta.last_page, onPageChange: setPage } : undefined}
      >
        <DataTable
          columns={columns}
          data={redemptions}
          getRowId={(row) => row.id}
          onRowClick={(row) => void navigate(`/marketing/promotions/${row.promotionId}`)}
          status={status === 'pending' ? 'loading' : status === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={{ icon: <Ticket className="size-8" aria-hidden="true" />, title: 'No redemptions yet', description: 'Nothing has been redeemed yet for this filter.' }}
        />
      </CrudPageLayout>
    </div>
  );
}
