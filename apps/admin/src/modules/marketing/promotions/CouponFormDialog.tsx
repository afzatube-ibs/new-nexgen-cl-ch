import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Alert } from '@nexgen/ui';
import type { CouponDTO } from '@nexgen/api-client';
import { marketingErrorMessage } from '../shared/errors.js';
import { useCreateCoupon, useUpdateCoupon } from './queries.js';

export interface CouponFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotionId: string;
  /** Present for edit; absent for create. */
  coupon?: CouponDTO;
}

/** Create/edit a Coupon nested under one Promotion — `promotions.coupons.manage`. `code` is plain, merchant-supplied, and globally unique (`unique:coupons,code`, confirmed via `CreateCouponRequest`) — no auto-generation exists on this real backend. */
export function CouponFormDialog({ open, onOpenChange, promotionId, coupon }: CouponFormDialogProps) {
  const isEdit = Boolean(coupon);
  const createMutation = useCreateCoupon();
  const updateMutation = useUpdateCoupon();
  const [code, setCode] = useState('');
  const [usageLimitGlobal, setUsageLimitGlobal] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCode(coupon?.code ?? '');
      setUsageLimitGlobal(coupon?.usageLimitGlobal != null ? String(coupon.usageLimitGlobal) : '');
      setError(null);
    }
  }, [open, coupon]);

  async function handleSubmit(): Promise<void> {
    if (!code.trim()) {
      setError('A coupon code is required.');
      return;
    }
    setError(null);
    const input = { code: code.trim(), usageLimitGlobal: usageLimitGlobal ? Number(usageLimitGlobal) : null };
    try {
      if (isEdit && coupon) {
        await updateMutation.mutateAsync({ promotionId, couponId: coupon.id, input: { ...input, expectedVersion: coupon.version } });
      } else {
        await createMutation.mutateAsync({ promotionId, input });
      }
      onOpenChange(false);
    } catch (err) {
      setError(marketingErrorMessage(err));
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit coupon' : 'New coupon'}</DialogTitle>
          <DialogDescription>{isEdit ? "Update this coupon's code or usage limit." : 'Create a manual coupon code for this promotion.'}</DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <Input label="Code" hint="Unique across every promotion." value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <Input
          label="Usage limit (total)"
          type="number"
          hint="Leave blank for unlimited."
          value={usageLimitGlobal}
          onChange={(e) => setUsageLimitGlobal(e.target.value)}
        />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} loading={isPending}>
            {isEdit ? 'Save changes' : 'Create coupon'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
