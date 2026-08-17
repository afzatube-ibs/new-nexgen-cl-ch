import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button, Text, Alert } from '@nexgen/ui';
import type { PromotionDTO, PromotionConditionDTO } from '@nexgen/api-client';
import { ConfirmDialog } from '../../../framework/index.js';
import { marketingErrorMessage } from '../shared/errors.js';
import { formatDecimal } from '../shared/formatDecimal.js';
import { useRemovePromotionCondition } from './queries.js';
import { PromotionConditionDialog } from './PromotionConditionDialog.js';

const CONDITION_TYPE_LABEL: Record<string, string> = {
  product: 'Product',
  category: 'Category',
  customer: 'Customer',
  store: 'Store',
  minimum_order_amount: 'Minimum order amount',
};

function conditionSummary(condition: PromotionConditionDTO): string {
  if (condition.conditionType === 'minimum_order_amount') return `≥ ${formatDecimal(condition.numericValue ?? '0')}`;
  return condition.referenceId ? condition.referenceId.slice(0, 8) : '—';
}

export interface PromotionConditionsManagerProps {
  promotion: PromotionDTO;
  canManage: boolean;
}

/** Lists and manages one Promotion's own eligibility Conditions — no independent list/get endpoint exists; the data arrives only via `PromotionController::show`'s own eager-loaded `conditions`. */
export function PromotionConditionsManager({ promotion, canManage }: PromotionConditionsManagerProps) {
  const conditions = promotion.conditions ?? [];
  const removeMutation = useRemovePromotionCondition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCondition, setEditingCondition] = useState<PromotionConditionDTO | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove(conditionId: string): Promise<void> {
    setError(null);
    try {
      await removeMutation.mutateAsync({ promotionId: promotion.id, conditionId, expectedVersion: promotion.version });
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
      {conditions.length === 0 ? (
        <Text variant="body" className="text-text-secondary">
          No eligibility conditions — this promotion applies to every eligible cart.
        </Text>
      ) : (
        <div className="flex flex-col gap-2">
          {conditions.map((condition) => (
            <div key={condition.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
              <Text variant="body" className="flex-1">
                {CONDITION_TYPE_LABEL[condition.conditionType]}: {conditionSummary(condition)}
              </Text>
              {canManage && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Edit condition"
                    onClick={() => {
                      setEditingCondition(condition);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="sm" aria-label="Remove condition">
                        <Trash2 className="size-4" />
                      </Button>
                    }
                    title="Remove this condition?"
                    description="The promotion will apply more broadly once this condition is removed."
                    confirmLabel="Remove"
                    destructive
                    onConfirm={() => handleRemove(condition.id)}
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
            setEditingCondition(undefined);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Add condition
        </Button>
      )}

      <PromotionConditionDialog open={dialogOpen} onOpenChange={setDialogOpen} promotion={promotion} condition={editingCondition} />
    </div>
  );
}
