import { Icon, cn } from '@nexgen/ui';
import { Check } from 'lucide-react';

/**
 * Store Components library — Beta Milestone 2.6's own "Shipping
 * timeline" build item: a real, visual step tracker. **Architecture
 * only** — no shipment-tracking data is composed from the Gateway to the
 * Storefront yet (Order/Shipment status is a real, existing capability
 * in `apps/admin`'s own Orders/Shipping modules, frozen Phase 2.6/2.8,
 * but reading a specific shopper's own order status from the Storefront
 * is a Category-B, post-login capability — explicitly out of every
 * milestone's scope so far). No live page renders this with a real
 * `currentStep` yet.
 */
export interface ShippingTimelineStep {
  id: string;
  label: string;
  /** Real timestamp/date string, when known. */
  completedAt?: string;
}

export interface ShippingTimelineProps {
  steps: ShippingTimelineStep[];
  currentStepIndex: number;
  className?: string;
}

export function ShippingTimeline({ steps, currentStepIndex, className }: ShippingTimelineProps) {
  if (steps.length === 0) return null;

  return (
    <ol className={cn('flex flex-col gap-0', className)}>
      {steps.map((step, index) => {
        const complete = index < currentStepIndex || (index === currentStepIndex && Boolean(step.completedAt));
        const current = index === currentStepIndex;
        return (
          <li key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-caption',
                  complete ? 'border-brand bg-brand text-white' : current ? 'border-brand text-brand' : 'border-border text-text-secondary',
                )}
              >
                {complete ? <Icon icon={Check} size="inline" /> : index + 1}
              </span>
              {index < steps.length - 1 && <span className={cn('w-0.5 flex-1', complete ? 'bg-brand' : 'bg-border')} style={{ minHeight: '24px' }} />}
            </div>
            <div className="flex flex-col gap-0.5 pb-6">
              <span className={cn('text-body-strong', current || complete ? 'text-text-primary' : 'text-text-secondary')}>{step.label}</span>
              {step.completedAt && <span className="text-caption text-text-secondary">{step.completedAt}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
