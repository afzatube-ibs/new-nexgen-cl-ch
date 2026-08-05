<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Couriers\Contracts;

use App\Domains\Operations\Shipping\Couriers\Support\ShipmentBookingRequest;
use App\Domains\Operations\Shipping\Couriers\Support\ShipmentBookingResult;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteRequest;
use App\Domains\Operations\Shipping\Couriers\Support\ShippingRateQuoteResult;
use App\Domains\Operations\Shipping\Exceptions\CourierBookingFailedException;

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
 * bookShipment()/supportsBooking() were added additively when Fulfillment
 * (`MODULE:FULFILLMENT`) was built, exactly as this docblock originally
 * anticipated ("Adding those methods later... is an additive interface
 * change; no implementation here needs to change to support it") — every
 * courier shipped before Fulfillment existed still compiles and still
 * satisfies this interface unmodified in shape, only extended. Fulfillment,
 * a same-domain (Operations) sibling, depends on this contract directly
 * per MODULE:INTERACTION_RULES ("Fulfillment MUST use Shipping's provider
 * contract... no courier-specific business logic inside Fulfillment") —
 * this module still owns every courier-specific detail; Fulfillment only
 * ever sees the provider-agnostic Support\ShipmentBookingRequest/Result
 * shapes.
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

    /**
     * Whether this provider publishes a real "create consignment" API a
     * caller can book a shipment through — false for Couriers\
     * ManualProvider (self-managed dispatch has no courier to book with)
     * and Couriers\SundarbanProvider (no public API — see that class's
     * docblock).
     */
    public function supportsBooking(): bool;

    /**
     * Books this shipment with the courier, returning its own consignment
     * identifier, tracking number, and (where the courier's API returns
     * one) a label URL. Only called when supportsBooking() and
     * isAvailable() are both true — Fulfillment's Actions\
     * DispatchShipmentAction enforces that via Couriers\ProviderResolver
     * before ever calling this method.
     *
     * @throws CourierBookingFailedException when the courier's own API
     *                                       rejects or fails the request.
     */
    public function bookShipment(ShipmentBookingRequest $request): ShipmentBookingResult;
}
