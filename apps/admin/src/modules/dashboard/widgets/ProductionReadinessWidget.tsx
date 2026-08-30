import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Text } from '@nexgen/ui';
import { DashboardWidgetCard } from '../../../framework/index.js';
import { usePaymentReadiness, useShippingReadiness, useNotificationReadiness, useCatalogReadiness } from './queries.js';

interface ReadinessRowProps {
  ok: boolean | undefined;
  okLabel: string;
  warningLabel: string;
  action?: { label: string; to: string };
  unavailableLabel?: string;
}

/**
 * One line of the checklist. `ok === undefined` means this specific check's
 * own query failed (most likely the caller lacks the permission the
 * underlying endpoint requires) — rendered as an honest "couldn't check"
 * state, never silently hidden and never assumed healthy.
 */
function ReadinessRow({ ok, okLabel, warningLabel, action, unavailableLabel }: ReadinessRowProps) {
  if (ok === undefined) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <div className="size-4 shrink-0 rounded-full border border-dashed border-border" aria-hidden="true" />
        <Text variant="body" className="text-text-secondary">
          {unavailableLabel ?? "Couldn't check — you may not have permission to view this."}
        </Text>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="size-4 shrink-0 text-feedback-success" aria-hidden="true" />
        ) : (
          <AlertTriangle className="size-4 shrink-0 text-feedback-warning" aria-hidden="true" />
        )}
        <Text variant="body" className={ok ? undefined : 'text-text-primary'}>
          {ok ? okLabel : warningLabel}
        </Text>
      </div>
      {!ok && action && (
        <Link to={action.to} className="shrink-0 text-caption text-brand hover:underline">
          {action.label}
        </Link>
      )}
    </div>
  );
}

/**
 * Production Completion Plan v2, Milestone 12 (Production Readiness
 * Indicators) — "a real onboarding checklist... and honest configuration
 * warnings... surfaced directly in the Admin Dashboard," assembled from
 * evidence this platform's own audit already named: an empty payment
 * gateway configuration, a single/no shipping zone, an empty catalog, no
 * notification provider. Every row reads a real, live endpoint — never a
 * static, one-time-computed checklist that goes stale the moment a
 * merchant fixes the underlying gap.
 *
 * Payment gateways and notification providers are environment-variable-
 * configured (`GatewayResolver`/`Channels\ProviderResolver`'s own
 * `isAvailable()`, sourced from real credentials in `.env`) — this
 * platform has no Admin UI to set those, so those two rows name what's
 * missing honestly without a fabricated "Configure →" link to a screen
 * that doesn't exist. Shipping zones and Catalog products both have real
 * Admin screens, so those two rows link there directly.
 */
export function ProductionReadinessWidget() {
  const payments = usePaymentReadiness();
  const shipping = useShippingReadiness();
  const notifications = useNotificationReadiness();
  const catalog = useCatalogReadiness();

  const queries = [payments, shipping, notifications, catalog];
  const anyLoading = queries.some((q) => q.status === 'pending');
  const allErrored = queries.every((q) => q.status === 'error');
  const status = anyLoading ? 'loading' : allErrored ? 'error' : 'success';

  return (
    <DashboardWidgetCard
      title="Production Readiness"
      icon={ShieldCheck}
      status={status}
      onRetry={() => {
        void payments.refetch();
        void shipping.refetch();
        void notifications.refetch();
        void catalog.refetch();
      }}
    >
      {/* By the time DashboardWidgetCard renders these children at all,
          `status` is already 'success' (never 'loading'/'pending') — see
          this component's own `status` computation above — so every
          query below has genuinely settled to either 'success' (real
          data present) or 'error' (data undefined) by this point. */}
      <div className="flex flex-col divide-y divide-border">
        <ReadinessRow
          ok={payments.status === 'error' ? undefined : (payments.data?.hasOnlineGateway ?? false)}
          okLabel="An online payment gateway is configured"
          warningLabel="No online payment gateway configured — customers can only pay via Cash on Delivery or Bank Transfer"
        />
        <ReadinessRow
          ok={shipping.status === 'error' ? undefined : (shipping.data?.zoneCount ?? 0) > 0}
          okLabel={shipping.data ? `${shipping.data.zoneCount} shipping zone${shipping.data.zoneCount === 1 ? '' : 's'} configured` : 'Shipping zones configured'}
          warningLabel="No shipping zones configured — customers have no destination to ship to"
          action={{ label: 'Configure →', to: '/shipping/zones' }}
        />
        <ReadinessRow
          ok={shipping.status === 'error' ? undefined : (shipping.data?.hasRealCourier ?? false)}
          okLabel="A real courier integration is configured"
          warningLabel="No real courier integration configured — orders can only be fulfilled manually"
        />
        <ReadinessRow
          ok={notifications.status === 'error' ? undefined : (notifications.data?.hasProvider ?? false)}
          okLabel="An email notification provider is configured"
          warningLabel="No email notification provider configured — customers won't receive order confirmations or updates"
        />
        <ReadinessRow
          ok={catalog.status === 'error' ? undefined : (catalog.data?.activeProductCount ?? 0) > 0}
          okLabel={catalog.data ? `${catalog.data.activeProductCount} active product${catalog.data.activeProductCount === 1 ? '' : 's'} in your catalog` : 'Catalog has active products'}
          warningLabel="Your catalog has no active products — there is nothing for customers to buy"
          action={{ label: 'Add products →', to: '/catalog/products' }}
        />
      </div>
    </DashboardWidgetCard>
  );
}
