import { CheckCircle2, Circle, Lock } from 'lucide-react';
import { Text } from '@nexgen/ui';
import type { ProductType } from '@nexgen/api-client';

export interface CompletionChecklistProps {
  name: string;
  sku: string;
  productType: ProductType;
  /** Category/variant assignment needs a real product id — genuinely `unavailable` (not just `missing`) until this product has been created once. */
  isNew: boolean;
  categoryCount: number;
  variantCount: number;
}

type ChecklistItemState = 'done' | 'missing' | 'unavailable';

interface ChecklistItem {
  label: string;
  state: ChecklistItemState;
  hint?: string;
}

const STATE_ICON: Record<ChecklistItemState, typeof CheckCircle2> = {
  done: CheckCircle2,
  missing: Circle,
  unavailable: Lock,
};

const STATE_CLASS: Record<ChecklistItemState, string> = {
  done: 'text-feedback-success',
  missing: 'text-text-secondary',
  unavailable: 'text-text-secondary',
};

/**
 * Mirrors the backend's *real* publish-completeness rule
 * (`PublishProductAction`, apps/backend: non-empty `name`, non-empty
 * `sku`, at least one category, and — for `configurable` products — at
 * least one variant) so a merchant sees, before clicking Publish, exactly
 * what it checks — never a client-invented completion score.
 *
 * Slice 2 update: category/variant assignment is now real (Organization/
 * Variants cards, below) — these two rows check real counts instead of
 * always rendering `unavailable`. They still render `unavailable` for a
 * brand-new, not-yet-created product specifically, since assignment
 * itself needs a real product id (`isNew`), not because the feature
 * doesn't exist.
 */
export function CompletionChecklist({ name, sku, productType, isNew, categoryCount, variantCount }: CompletionChecklistProps) {
  const items: ChecklistItem[] = [
    { label: 'Name', state: name.trim().length > 0 ? 'done' : 'missing' },
    { label: 'SKU', state: sku.trim().length > 0 ? 'done' : 'missing' },
    isNew
      ? { label: 'At least one category', state: 'unavailable', hint: 'Save the product first, then assign a category in Organization below.' }
      : { label: 'At least one category', state: categoryCount > 0 ? 'done' : 'missing', hint: categoryCount > 0 ? undefined : 'Assign at least one category in Organization, below.' },
  ];

  if (productType === 'configurable') {
    items.push(
      isNew
        ? { label: 'At least one variant', state: 'unavailable', hint: 'Save the product first, then add a variant below.' }
        : { label: 'At least one variant', state: variantCount > 0 ? 'done' : 'missing', hint: variantCount > 0 ? undefined : 'Add at least one variant below.' },
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const Icon = STATE_ICON[item.state];
        return (
          <li key={item.label} className="flex items-start gap-2">
            <Icon className={`mt-0.5 size-4 shrink-0 ${STATE_CLASS[item.state]}`} aria-hidden="true" />
            <div>
              <Text variant="body" className={item.state === 'done' ? 'text-text-primary' : 'text-text-secondary'}>
                {item.label}
                {item.state === 'unavailable' && <span className="ml-1.5 text-caption">(not yet available)</span>}
              </Text>
              {item.hint && (
                <Text variant="caption" className="text-text-secondary">
                  {item.hint}
                </Text>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
