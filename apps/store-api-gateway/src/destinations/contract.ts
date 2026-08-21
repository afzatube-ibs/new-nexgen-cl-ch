/**
 * The Destination contract — CDP_ARCHITECTURE.md §5.1: "exactly the same
 * shape as `PaymentGatewayContract` (Payments) and `SearchEngineContract`
 * (Search)... implement the contract, register it." Every destination
 * (Meta, GA4, TikTok, a custom webhook, the internal CDP warehouse) is one
 * class satisfying this interface — the Event Pipeline never contains
 * destination-specific branching logic, per this slice's own explicit
 * "events must NOT contain destination-specific business logic" rule.
 */
import type { CdpEvent } from '../events/types.js';

export interface DeliveryResult {
  delivered: boolean;
  /** A human-legible reason, used in logs/DLQ inspection when delivered is false. */
  reason?: string;
}

export interface DestinationContract {
  /** A unique, stable identifier — e.g. "meta-capi", "webhook:merchant-configured". */
  readonly id: string;
  /** Gated on configured credentials, exactly like PaymentGatewayContract::isAvailable() — an unconfigured destination is skipped, never attempted and failed. */
  isAvailable(): boolean;
  /** Consent is enforced HERE too, independently of the Router's own filtering — SECURITY:DEFENSE_IN_DEPTH, per CDP_ARCHITECTURE.md §5.3. */
  send(event: CdpEvent): Promise<DeliveryResult>;
}
