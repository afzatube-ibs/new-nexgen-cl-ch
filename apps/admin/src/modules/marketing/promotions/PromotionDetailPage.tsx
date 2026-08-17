import { useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Archive, Trash2 } from 'lucide-react';
import { Text, Badge, Button, Card, CardHeader, CardTitle, CardContent, Skeleton, ErrorState, useToast } from '@nexgen/ui';
import type { PromotionDTO } from '@nexgen/api-client';
import { RequirePermission, ConfirmDialog } from '../../../framework/index.js';
import { marketingErrorMessage } from '../shared/errors.js';
import { formatDecimal } from '../shared/formatDecimal.js';
import { useAuth } from '../../../auth/useAuth.js';
import { usePromotion, useArchivePromotion, useDestroyPromotion } from './queries.js';
import { PromotionFormDialog } from './PromotionFormDialog.js';
import { PromotionConditionsManager } from './PromotionConditionsManager.js';
import { CouponsManager } from './CouponsManager.js';
import { PromotionRedemptionTimeline } from './PromotionRedemptionTimeline.js';

const DISCOUNT_TYPE_LABEL: Record<string, string> = {
  percentage: 'Percentage',
  fixed_amount: 'Fixed amount',
  buy_x_get_y: 'Buy X get Y',
  free_shipping: 'Free shipping',
};

function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}

function OverviewField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <Text variant="caption" className="text-text-secondary">
        {label}
      </Text>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

function discountSummary(promotion: PromotionDTO): string {
  switch (promotion.discountType) {
    case 'percentage':
      return `${formatDecimal(promotion.discountValue ?? '0')}% off`;
    case 'fixed_amount':
      return `${formatDecimal(promotion.discountValue ?? '0')} ${promotion.currencyCode} off`;
    case 'buy_x_get_y':
      return `Buy ${promotion.buyXQuantity}, get ${promotion.getYQuantity} at ${formatDecimal(promotion.getYDiscountPercentage ?? '0')}% off`;
    case 'free_shipping':
      return 'Free shipping';
    default:
      return '—';
  }
}

/**
 * Promotion Detail — `PromotionController::show`, the only endpoint that
 * eager-loads `conditions`/`coupons`. Mirrors Payment/Shipment Detail's own
 * shape: a dedicated route (not a drawer), since this entity genuinely
 * holds three real sub-sections (Overview, Conditions, Coupons), not a
 * handful of flat fields.
 */
export function PromotionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { can } = useAuth();
  const canManage = can('promotions.promotions.manage');
  const { data: promotion, status: queryStatus, refetch } = usePromotion(id);

  const archiveMutation = useArchivePromotion();
  const destroyMutation = useDestroyPromotion();
  const [editOpen, setEditOpen] = useState(false);

  if (queryStatus === 'pending') {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton shape="block" className="h-8 w-64" />
        <Skeleton shape="block" className="h-40 w-full" />
        <Skeleton shape="block" className="h-40 w-full" />
      </div>
    );
  }

  if (queryStatus === 'error' || !promotion) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const handleArchive = async (): Promise<void> => {
    await archiveMutation.mutateAsync({ id: promotion.id, expectedVersion: promotion.version });
    toast({ variant: 'success', title: 'Promotion archived' });
  };

  const handleDestroy = async (): Promise<void> => {
    await destroyMutation.mutateAsync({ id: promotion.id, expectedVersion: promotion.version });
    toast({ variant: 'success', title: 'Promotion deleted' });
    void navigate('/marketing/promotions');
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => void navigate('/marketing/promotions')}
        className="mb-3 inline-flex items-center gap-1 text-label text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Back to Promotions
      </button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Text as="h1" variant="heading">
              {promotion.name}
            </Text>
            <Badge variant={promotion.status === 'active' ? 'success' : 'default'}>{promotion.status}</Badge>
          </div>
          <Text variant="body" className="mt-1 text-text-secondary">
            {discountSummary(promotion)}
          </Text>
        </div>
        <RequirePermission anyOf={['promotions.promotions.manage']} inline={null}>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
            {promotion.status === 'active' && (
              <ConfirmDialog
                trigger={
                  <Button variant="outline">
                    <Archive className="size-4" /> Archive
                  </Button>
                }
                title="Archive this promotion?"
                description="It will stop applying at Checkout. This can't be undone — there's no restore for promotions on this backend."
                confirmLabel="Archive"
                onConfirm={handleArchive}
                getErrorMessage={marketingErrorMessage}
              />
            )}
            <ConfirmDialog
              trigger={
                <Button variant="outline" className="text-feedback-danger hover:text-feedback-danger">
                  <Trash2 className="size-4" /> Delete
                </Button>
              }
              title="Delete this promotion?"
              description={`"${promotion.name}" will be permanently deleted, along with its conditions and coupons. This cannot be undone.`}
              confirmLabel="Delete"
              destructive
              onConfirm={handleDestroy}
              getErrorMessage={marketingErrorMessage}
            />
          </div>
        </RequirePermission>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <OverviewField label="Discount type" value={<Text variant="body">{DISCOUNT_TYPE_LABEL[promotion.discountType]}</Text>} />
              <OverviewField label="Priority" value={<Text variant="body">{promotion.priority}</Text>} />
              <OverviewField label="Stackable" value={<Text variant="body">{promotion.isStackable ? 'Yes' : 'No'}</Text>} />
              <OverviewField label="Requires coupon" value={<Text variant="body">{promotion.requiresCoupon ? 'Yes' : 'No'}</Text>} />
              <OverviewField label="Starts" value={<Text variant="body">{formatDateTime(promotion.startsAt)}</Text>} />
              <OverviewField label="Ends" value={<Text variant="body">{formatDateTime(promotion.endsAt)}</Text>} />
              <OverviewField
                label="Global usage"
                value={
                  <Text variant="body">
                    {promotion.usageLimitGlobal ? `${promotion.usageCountGlobal} / ${promotion.usageLimitGlobal}` : `${promotion.usageCountGlobal} (unlimited)`}
                  </Text>
                }
              />
              <OverviewField
                label="Per-customer limit"
                value={<Text variant="body">{promotion.usageLimitPerCustomer ?? 'Unlimited'}</Text>}
              />
              {promotion.description && (
                <OverviewField label="Description" value={<Text variant="body">{promotion.description}</Text>} />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eligibility conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <PromotionConditionsManager promotion={promotion} canManage={canManage} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coupons</CardTitle>
          </CardHeader>
          <CardContent>
            <CouponsManager promotion={promotion} canManage={canManage} />
          </CardContent>
        </Card>

        <RequirePermission anyOf={['promotions.redemptions.view']} inline={null}>
          <Card>
            <CardHeader>
              <CardTitle>Redemption timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <PromotionRedemptionTimeline promotion={promotion} />
            </CardContent>
          </Card>
        </RequirePermission>
      </div>

      <PromotionFormDialog open={editOpen} onOpenChange={setEditOpen} promotion={promotion} />
    </div>
  );
}
