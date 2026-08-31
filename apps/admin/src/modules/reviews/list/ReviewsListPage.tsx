import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MoreHorizontal, Check, X, MessageSquare, Trash2, Star, CheckCircle2 } from 'lucide-react';
import {
  DataTable,
  type DataTableColumn,
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Select,
  Input,
  Text,
} from '@nexgen/ui';
import type { ReviewDTO, ReviewStatus } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { useAuth } from '../../../auth/useAuth.js';
import { reviewsErrorMessage } from '../shared/errors.js';
import { useReviews, useApproveReview, useDeleteReview } from '../shared/queries.js';
import { ReviewRejectDialog } from './ReviewRejectDialog.js';
import { ReviewRespondDialog } from './ReviewRespondDialog.js';

type StatusFilter = 'all' | ReviewStatus;

const STATUS_VARIANT: Record<ReviewStatus, 'default' | 'success' | 'danger'> = {
  pending: 'default',
  approved: 'success',
  rejected: 'danger',
};

function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className={`size-3.5 ${index < rating ? 'fill-current text-feedback-warning' : 'text-border'}`} aria-hidden="true" />
      ))}
    </div>
  );
}

/**
 * Reviews — Production Completion Plan v2, Milestone 13 (Reviews Admin
 * Moderation UI). Every moderation capability real backend
 * `ReviewWorkflowController` exposes (approve/reject/respond) has been
 * real and reachable via the permission-gated API since Milestone 11
 * shipped the backend — this is the first Admin screen that actually
 * reaches it. `ReviewController::index` genuinely supports server-side
 * `product_id`/`status`/`customer_id`/`page`/`per_page` (confirmed by
 * reading it directly) — real, server-driven pagination and filtering,
 * mirroring `ReturnRequestsListPage`'s own shape.
 *
 * **No "Customer" name column** — `ReviewResource` carries `authorName`
 * (a real snapshot of the customer's name at submission time, per
 * `CreateReviewAction`'s own docblock) directly, so this list already
 * shows a real display name with no N+1 `GET /customers/{id}` lookup
 * needed at all — a genuine improvement over modules whose resource only
 * carries a bare `customerId`.
 *
 * **No "Product" name column** — `ReviewResource` carries only
 * `productId` (Reviews has no code-level dependency on Catalog at all,
 * confirmed via that module's own Arch test) — shown as a filterable raw
 * id, matching every other module's own identical "no live cross-domain
 * join" decision (e.g. `ReturnRequestsListPage`'s own Customer column).
 */
export function ReviewsListPage() {
  const { can } = useAuth();
  const canModerate = can('reviews.reviews.moderate');
  const canManage = can('reviews.reviews.manage');
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<StatusFilter>('all');
  const [productId, setProductId] = useState<string>(searchParams.get('product_id') ?? '');
  const [page, setPage] = useState(1);
  const [rejectingReview, setRejectingReview] = useState<ReviewDTO | null>(null);
  const [respondingReview, setRespondingReview] = useState<ReviewDTO | null>(null);

  const trimmedProductId = productId.trim();
  const { data, status: queryStatus, refetch } = useReviews({
    status: status === 'all' ? undefined : status,
    productId: trimmedProductId || undefined,
    page,
  });
  const reviews = useMemo(() => data?.data ?? [], [data]);

  const approveMutation = useApproveReview();
  const deleteMutation = useDeleteReview();

  useEffect(() => setPage(1), [status, trimmedProductId]);

  const columns: DataTableColumn<ReviewDTO>[] = [
    {
      id: 'review',
      header: 'Review',
      cell: (row) => (
        <div className="flex max-w-md flex-col gap-1 py-1">
          <div className="flex items-center gap-2">
            <StarRating rating={row.rating} />
            {row.verifiedPurchase && (
              <span className="flex items-center gap-1 text-caption text-feedback-success">
                <CheckCircle2 className="size-3" aria-hidden="true" /> Verified
              </span>
            )}
          </div>
          {row.title && <Text variant="body-strong">{row.title}</Text>}
          <Text variant="caption" className="line-clamp-2 text-text-secondary">
            {row.body}
          </Text>
        </div>
      ),
    },
    { id: 'author', header: 'Author', cell: (row) => row.authorName },
    { id: 'product', header: 'Product', cell: (row) => <span className="font-mono text-caption">{row.productId.slice(0, 8)}</span> },
    { id: 'status', header: 'Status', cell: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge> },
    { id: 'response', header: 'Response', cell: (row) => (row.merchantResponse ? <Badge variant="info">Responded</Badge> : '—') },
    { id: 'created', header: 'Submitted', cell: (row) => formatDateTime(row.createdAt) },
    {
      id: 'actions',
      header: '',
      className: 'w-10',
      cell: (row) => (
        <RequirePermission anyOf={['reviews.reviews.moderate', 'reviews.reviews.manage']} inline={null}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label={`Actions for this review by ${row.authorName}`} onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {canModerate && row.status !== 'approved' && (
                <DropdownMenuItem onSelect={() => void approveMutation.mutateAsync({ id: row.id, input: { expectedVersion: row.version } })}>
                  <Check className="size-4" /> Approve
                </DropdownMenuItem>
              )}
              {canModerate && row.status !== 'rejected' && (
                <DropdownMenuItem onSelect={() => setRejectingReview(row)}>
                  <X className="size-4" /> Reject
                </DropdownMenuItem>
              )}
              {canManage && (
                <DropdownMenuItem onSelect={() => setRespondingReview(row)}>
                  <MessageSquare className="size-4" /> {row.merchantResponse ? 'Edit response' : 'Respond'}
                </DropdownMenuItem>
              )}
              {canManage && (
                <ConfirmDialog
                  trigger={
                    <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  }
                  title="Delete this review?"
                  description="This permanently removes the review from the storefront and moderation queue. This cannot be undone."
                  confirmLabel="Delete"
                  destructive
                  onConfirm={() => deleteMutation.mutateAsync({ id: row.id, input: { expectedVersion: row.version } })}
                  getErrorMessage={reviewsErrorMessage}
                />
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </RequirePermission>
      ),
    },
  ];

  return (
    <>
      <CrudPageLayout
        header={{ title: 'Reviews', description: 'Moderate customer reviews, respond as the merchant, and remove abusive content.' }}
        toolbar={
          <Toolbar
            filters={
              <FilterBar
                active={[
                  ...(status === 'all' ? [] : [{ key: 'status', label: 'Status', displayValue: status }]),
                  ...(trimmedProductId ? [{ key: 'product', label: 'Product', displayValue: trimmedProductId.slice(0, 8) }] : []),
                ]}
                onRemove={(key) => {
                  if (key === 'status') setStatus('all');
                  if (key === 'product') setProductId('');
                }}
                onClearAll={() => {
                  setStatus('all');
                  setProductId('');
                }}
              >
                <div className="flex flex-col gap-3">
                  <Select
                    label="Status"
                    value={status}
                    onValueChange={(v) => setStatus(v as StatusFilter)}
                    options={[
                      { value: 'all', label: 'All' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'approved', label: 'Approved' },
                      { value: 'rejected', label: 'Rejected' },
                    ]}
                  />
                  <Input label="Product ID" placeholder="Filter by product UUID…" value={productId} onChange={(e) => setProductId(e.target.value)} />
                </div>
              </FilterBar>
            }
          />
        }
        pagination={data?.meta?.last_page ? { currentPage: data.meta.current_page ?? page, totalPages: data.meta.last_page, onPageChange: setPage } : undefined}
      >
        <DataTable
          columns={columns}
          data={reviews}
          getRowId={(row) => row.id}
          status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={
            status !== 'all' || trimmedProductId
              ? { icon: <Star className="size-8" aria-hidden="true" />, title: 'No matching reviews', description: 'No reviews match the current filter.' }
              : { icon: <Star className="size-8" aria-hidden="true" />, title: 'No reviews yet', description: 'A review appears here the moment a customer submits one on the storefront.' }
          }
        />
      </CrudPageLayout>

      {rejectingReview && <ReviewRejectDialog open={Boolean(rejectingReview)} onOpenChange={(open) => !open && setRejectingReview(null)} review={rejectingReview} />}
      {respondingReview && <ReviewRespondDialog open={Boolean(respondingReview)} onOpenChange={(open) => !open && setRespondingReview(null)} review={respondingReview} />}
    </>
  );
}
