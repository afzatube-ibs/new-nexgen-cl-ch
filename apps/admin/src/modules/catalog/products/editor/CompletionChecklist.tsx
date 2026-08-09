import { CheckCircle2, Circle, Lock } from 'lucide-react';
import { Text } from '@nexgen/ui';
import type { ProductType } from '@nexgen/api-client';

export interface CompletionChecklistProps {
  name: string;
  sku: string;
  productType: ProductType;
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
 * what it checks — never a client-invented completion score. Category and
 * Variant assignment aren't buildable in this UI yet (Organization/
 * Variants are Slice 2), so those two rows render as `unavailable`, not as
 * a failable checkbox — an honest "this is required and you can't do it
 * here yet" rather than pretending it's optional.
 */
export function CompletionChecklist({ name, sku, productType }: CompletionChecklistProps) {
  const items: ChecklistItem[] = [
    { label: 'Name', state: name.trim().length > 0 ? 'done' : 'missing' },
    { label: 'SKU', state: sku.trim().length > 0 ? 'done' : 'missing' },
    {
      label: 'At least one category',
      state: 'unavailable',
      hint: 'Required by the backend to publish — category assignment isn’t available in this editor yet (coming in a later phase).',
    },
  ];

  if (productType === 'configurable') {
    items.push({
      label: 'At least one variant',
      state: 'unavailable',
      hint: 'Required for configurable products — Variants aren’t available in this editor yet (coming in a later phase).',
    });
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
