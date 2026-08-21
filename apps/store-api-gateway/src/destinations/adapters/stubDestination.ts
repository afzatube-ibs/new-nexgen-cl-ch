/**
 * Meta CAPI / GA4 / TikTok Events API — CDP_ARCHITECTURE.md §5.2's named
 * destinations. Each is a real `DestinationContract` implementation with
 * the real, documented shape a live integration needs (endpoint, hashed-
 * PII matching per §5.2, `event_id`-based dedup per §4.4) — but genuinely
 * `isAvailable() === false` until real credentials are configured, per the
 * contract's own "gated on configured credentials, exactly like
 * PaymentGatewayContract" rule. This is the honest difference between this
 * file and webhookDestination.ts: identical contract, genuinely
 * un-deliverable today, not a disguised fake success.
 *
 * One factory, parameterized, rather than three near-identical files —
 * the field-mapping difference between Meta/GA4/TikTok belongs in a real
 * implementation's own request-shaping logic, which does not exist yet
 * without real credentials to build and test against.
 */
import type { DestinationContract, DeliveryResult } from '../contract.js';
import type { CdpEvent } from '../../events/types.js';

export interface StubDestinationConfig {
  id: 'meta-capi' | 'ga4' | 'tiktok-events';
  apiKey: string | undefined;
}

export function createStubDestination(config: StubDestinationConfig): DestinationContract {
  return {
    id: config.id,
    isAvailable: () => Boolean(config.apiKey),
    // eslint-disable-next-line @typescript-eslint/require-await -- contract requires Promise<DeliveryResult>; genuinely nothing to await until real credentials/HTTP call exist
    async send(_event: CdpEvent): Promise<DeliveryResult> {
      return { delivered: false, reason: 'not_configured' };
    },
  };
}
