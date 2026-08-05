<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Couriers\Contracts;

use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteRequest;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteResult;

/**
 * The one seam every courier integrates through — "Future couriers must
 * only implement the ShippingProvider contract. No business logic changes
 * required," mirroring Payments' PaymentGatewayContract exactly (see that
 * interface's docblock for the identical rationale).
 *
 * A future courier becomes a new class implementing this interface plus a
 * Couriers\ProviderFactory case and a config/shipping.php entry — never a
 * change to Models\ShippingMethod, any Actions\* class, or any controller.
 *
 * Deliberately narrow: this module's own approved scope is shipping
 * configuration and rate calculation, per docs/04_MODULE_ARCHITECTURE.md's
 * `MODULE:SHIPPING` ("owns shipping method configuration and rate
 * information") — the actual creation of a shipment/consignment, its
 * label, and its tracking lifecycle belong to the future Fulfillment
 * module (`MODULE:FULFILLMENT`, "owns the record of what has been picked,
 * packed, and shipped against an order"), which the master plan describes
 * as generating "labels/tracking via Shipping." This contract is that
 * seam: Fulfillment, a same-domain (Operations) sibling, may depend on it
 * directly per MODULE:INTERACTION_RULES once built — nothing here commits
 * to a shipment-creation or label API shape prematurely, which is exactly
 * the "Shipping Labels (extension point)" boundary this module was asked
 * to respect. Adding those methods later, when Fulfillment is built, is an
 * additive interface change; no implementation here needs to change to
 * support it.
 */
interface ShippingProviderContract
{
    /**
     * The stable identifier this provider is registered and resolved
     * under — must match its config/shipping.php key and
     * Models\ShippingMethod::$provider_code values that select it.
     */
    public function code(): string;

    public function label(): string;

    /**
     * Whether this provider is currently usable — false when required
     * configuration (API credentials) is absent, per SECURITY:
     * SECRETS_MANAGEMENT. Couriers\ProviderResolver refuses to resolve an
     * unavailable provider rather than letting a caller discover the gap
     * mid-request.
     */
    public function isAvailable(): bool;

    /**
     * Whether this provider publishes a live, callable rate-quote API at
     * all, distinct from isAvailable() (a provider can genuinely have no
     * such API regardless of whether its credentials are configured).
     */
    public function supportsLiveRateQuote(): bool;

    /**
     * Queries this courier's own live rate-quote API, for the small subset
     * of couriers that publish one. Per PRINCIPLES:EXPLICIT_FAILURE, a
     * courier that does not support this (supportsLiveRateQuote() ===
     * false) returns null honestly rather than fabricating a figure —
     * Actions\CalculateShippingRateAction falls back to this platform's
     * own configured Models\ShippingRate card in that case, exactly as it
     * does for every Bangladesh-first courier shipped with this module
     * today (none of the six publish a real-time, per-shipment rate-quote
     * API — confirmed against each courier's own documentation; see
     * config/shipping.php's docblock).
     */
    public function quoteLiveRate(ShippingRateQuoteRequest $request): ?ShippingRateQuoteResult;
}
