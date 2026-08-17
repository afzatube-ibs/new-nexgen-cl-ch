import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Select, Alert } from '@nexgen/ui';
import type { PromotionDTO, PromotionConditionDTO, ConditionType } from '@nexgen/api-client';
import { marketingErrorMessage } from '../shared/errors.js';
import { formatDecimal } from '../shared/formatDecimal.js';
import { useAddPromotionCondition, useUpdatePromotionCondition } from './queries.js';

export interface PromotionConditionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotion: PromotionDTO;
  /** Present for edit; absent for add. */
  condition?: PromotionConditionDTO;
}

const CONDITION_TYPE_OPTIONS: { value: ConditionType; label: string }[] = [
  { value: 'product', label: 'Product' },
  { value: 'category', label: 'Category' },
  { value: 'customer', label: 'Customer' },
  { value: 'store', label: 'Store' },
  { value: 'minimum_order_amount', label: 'Minimum order amount' },
];

/**
 * Add/edit one `PromotionCondition` — `promotions.promotions.manage`
 * (conditions have no permission of their own; managed as part of the
 * parent Promotion). Mirrors `AddPromotionConditionRequest`'s own rule
 * exactly: `minimum_order_amount` needs `numericValue`, every other type
 * needs `referenceId` — a real Product/Category/Customer/Store id, entered
 * directly (no picker UI this slice — a real, honest scope limit, not an
 * oversight: this module owns no product/customer search of its own).
 */
export function PromotionConditionDialog({ open, onOpenChange, promotion, condition }: PromotionConditionDialogProps) {
  const isEdit = Boolean(condition);
  const addMutation = useAddPromotionCondition();
  const updateMutation = useUpdatePromotionCondition();
  const [conditionType, setConditionType] = useState<ConditionType>('minimum_order_amount');
  const [referenceId, setReferenceId] = useState('');
  const [numericValue, setNumericValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setConditionType(condition?.conditionType ?? 'minimum_order_amount');
      setReferenceId(condition?.referenceId ?? '');
      setNumericValue(condition?.numericValue ? formatDecimal(condition.numericValue) : '');
      setError(null);
    }
  }, [open, condition]);

  const isMinimumOrderAmount = conditionType === 'minimum_order_amount';

  async function handleSubmit(): Promise<void> {
    if (isMinimumOrderAmount && !numericValue.trim()) {
      setError('A minimum-order-amount condition requires a numeric value.');
      return;
    }
    if (!isMinimumOrderAmount && !referenceId.trim()) {
      setError('This condition type requires a reference id.');
      return;
    }
    setError(null);
    const input = {
      conditionType,
      referenceId: isMinimumOrderAmount ? null : referenceId.trim(),
      numericValue: isMinimumOrderAmount ? numericValue.trim() : null,
      expectedVersion: promotion.version,
    };
    try {
      if (isEdit && condition) {
        await updateMutation.mutateAsync({ promotionId: promotion.id, conditionId: condition.id, input });
      } else {
        await addMutation.mutateAsync({ promotionId: promotion.id, input });
      }
      onOpenChange(false);
    } catch (err) {
      setError(marketingErrorMessage(err));
    }
  }

  const isPending = addMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit condition' : 'Add eligibility condition'}</DialogTitle>
          <DialogDescription>
            Conditions of the same type are OR&rsquo;d together; different types are AND&rsquo;d. A cart must satisfy every condition type present for this
            promotion to apply.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <Select
          label="Condition type"
          value={conditionType}
          onValueChange={(v) => setConditionType(v as ConditionType)}
          options={CONDITION_TYPE_OPTIONS}
        />
        {isMinimumOrderAmount ? (
          <Input label="Minimum order amount" type="number" step="0.01" value={numericValue} onChange={(e) => setNumericValue(e.target.value)} />
        ) : (
          <Input
            label={`${CONDITION_TYPE_OPTIONS.find((o) => o.value === conditionType)?.label} id`}
            placeholder="A real UUID from that module"
            value={referenceId}
            onChange={(e) => setReferenceId(e.target.value)}
          />
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} loading={isPending}>
            {isEdit ? 'Save changes' : 'Add condition'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
