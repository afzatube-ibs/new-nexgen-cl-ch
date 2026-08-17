import { useNavigate } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import { Text, Skeleton, ErrorState } from '@nexgen/ui';
import type { PromotionDTO } from '@nexgen/api-client';
import { RequirePermission } from '../../../framework/index.js';
import { usePromotionRedemptions } from '../redemptions/queries.js';
import { formatDecimal } from '../shared/formatDecimal.js';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export interface PromotionRedemptionTimelineProps {
  promotion: PromotionDTO;
}

/**
 * A real, server-filtered (`promotion_id`) history of every actual Checkout
 * redemption of this one Promotion — `GET /promotions/redemptions?
 * promotion_id={id}`, the same endpoint the standalone Redemptions page
 * uses, just scoped here to one Promotion and capped to the most recent 10.
 * Never a manual "Redeem" action — every row here was created exclusively
 * by real Checkout traffic, per `PHASE_3_0_MARKETING_ARCHITECTURE.md` §4/§9.
 */
export function PromotionRedemptionTimeline({ promotion }: PromotionRedemptionTimelineProps) {
  const navigate = useNavigate();
  const { data, status, refetch } = usePromotionRedemptions({ promotionId: promotion.id, perPage: 10 });
  const redemptions = data?.data ?? [];

  if (status === 'pending') {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton shape="block" className="h-10 w-full" />
        <Skeleton shape="block" className="h-10 w-full" />
      </div>
    );
  }

  if (status === 'error') {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  if (redemptions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Ticket className="size-8 text-text-secondary" aria-hidden="true" />
        <Text variant="body" className="text-text-secondary">
          This promotion hasn&rsquo;t been redeemed at Checkout yet.
        </Text>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {redemptions.map((redemption) => (
        <div key={redemption.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
          <div>
            <Text variant="body-strong" className="tabular-nums">
              {`${formatDecimal(redemption.discountAmount)} ${redemption.currencyCode}`}
            </Text>
            <Text variant="caption" className="text-text-secondary">
              {formatDateTime(redemption.redeemedAt)}
              {redemption.couponId ? ' · via coupon' : ''}
            </Text>
          </div>
          {redemption.customerId && (
            <RequirePermission anyOf={['customers.customers.view']} inline={null}>
              <button
                type="button"
                className="text-label text-brand-primary hover:underline"
                onClick={() => void navigate(`/customers/${redemption.customerId}`)}
              >
                View customer
              </button>
            </RequirePermission>
          )}
        </div>
      ))}
      {(data?.meta?.total ?? 0) > redemptions.length && (
        <Text variant="caption" className="text-text-secondary">
          Showing the {redemptions.length} most recent of {data?.meta?.total} real redemptions.{' '}
          <button
            type="button"
            className="text-brand-primary hover:underline"
            onClick={() => void navigate(`/marketing/redemptions?promotion_id=${promotion.id}`)}
          >
            View all
          </button>
        </Text>
      )}
    </div>
  );
}
