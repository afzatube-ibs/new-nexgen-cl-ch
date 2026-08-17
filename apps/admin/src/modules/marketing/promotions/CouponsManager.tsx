import { useState } from 'react';
import { Plus, Pencil, Archive, Trash2 } from 'lucide-react';
import { Button, Text, Badge, Alert } from '@nexgen/ui';
import type { PromotionDTO, CouponDTO } from '@nexgen/api-client';
import { ConfirmDialog } from '../../../framework/index.js';
import { marketingErrorMessage } from '../shared/errors.js';
import { useArchiveCoupon, useDestroyCoupon } from './queries.js';
import { CouponFormDialog } from './CouponFormDialog.js';

export interface CouponsManagerProps {
  promotion: PromotionDTO;
  canManage: boolean;
}

/**
 * Lists and manages one Promotion's own Coupons — `GET /promotions/{promotion}/
 * coupons`, `promotions.coupons.{view|manage}`. No top-level "all coupons"
 * endpoint exists on this real backend; a coupon is always reached through
 * its own Promotion. Sourced from the Promotion's own eager-loaded `coupons`
 * (`PromotionController::show`) rather than a separate list query — the
 * simplest honest choice for the low cardinality one Promotion's own
 * coupons genuinely have.
 */
export function CouponsManager({ promotion, canManage }: CouponsManagerProps) {
  const coupons = promotion.coupons ?? [];
  const archiveMutation = useArchiveCoupon();
  const destroyMutation = useDestroyCoupon();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponDTO | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive(coupon: CouponDTO): Promise<void> {
    setError(null);
    try {
      await archiveMutation.mutateAsync({ promotionId: promotion.id, couponId: coupon.id, expectedVersion: coupon.version });
    } catch (err) {
      setError(marketingErrorMessage(err));
    }
  }

  async function handleDestroy(coupon: CouponDTO): Promise<void> {
    setError(null);
    try {
      await destroyMutation.mutateAsync({ promotionId: promotion.id, couponId: coupon.id, expectedVersion: coupon.version });
    } catch (err) {
      setError(marketingErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}
      {!promotion.requiresCoupon && (
        <Text variant="caption" className="text-text-secondary">
          This promotion doesn&rsquo;t require a coupon — any coupons below are optional, not required to redeem it.
        </Text>
      )}
      {coupons.length === 0 ? (
        <Text variant="body" className="text-text-secondary">
          No coupon codes yet.
        </Text>
      ) : (
        <div className="flex flex-col gap-2">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
              <Text variant="body-strong" className="font-mono flex-1">
                {coupon.code}
              </Text>
              <Text variant="caption" className="text-text-secondary">
                {coupon.usageLimitGlobal ? `${coupon.usageCountGlobal} / ${coupon.usageLimitGlobal} used` : `${coupon.usageCountGlobal} used`}
              </Text>
              <Badge variant={coupon.status === 'active' ? 'success' : 'default'}>{coupon.status}</Badge>
              {canManage && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit coupon ${coupon.code}`}
                    onClick={() => {
                      setEditingCoupon(coupon);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  {coupon.status === 'active' && (
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="sm" aria-label={`Archive coupon ${coupon.code}`}>
                          <Archive className="size-4" />
                        </Button>
                      }
                      title="Archive this coupon?"
                      description="It will stop redeeming at Checkout. This can't be undone — there's no restore for coupons on this backend."
                      confirmLabel="Archive"
                      onConfirm={() => handleArchive(coupon)}
                    />
                  )}
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="sm" aria-label={`Delete coupon ${coupon.code}`}>
                        <Trash2 className="size-4" />
                      </Button>
                    }
                    title="Delete this coupon?"
                    description={`"${coupon.code}" will be permanently deleted. This cannot be undone.`}
                    confirmLabel="Delete"
                    destructive
                    onConfirm={() => handleDestroy(coupon)}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {canManage && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setEditingCoupon(undefined);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> New coupon
        </Button>
      )}

      <CouponFormDialog open={dialogOpen} onOpenChange={setDialogOpen} promotionId={promotion.id} coupon={editingCoupon} />
    </div>
  );
}
