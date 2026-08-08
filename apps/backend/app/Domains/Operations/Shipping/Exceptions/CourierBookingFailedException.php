<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Exceptions;

use RuntimeException;
use Throwable;

/**
 * A courier's own real "create consignment" API rejected or failed a
 * Couriers\Contracts\ShippingProviderContract::bookShipment() call, or the
 * provider does not support booking at all (Couriers\
 * SundarbanProvider — no public API; Couriers\ManualProvider —
 * self-managed dispatch has no external booking to perform). Per
 * PRINCIPLES:EXPLICIT_FAILURE, a courier hand-off failure must surface
 * clearly to the caller (Fulfillment's Actions\DispatchShipmentAction),
 * never be silently swallowed or produce a fabricated tracking number.
 *
 * Not mapped in bootstrap/app.php — corrected here during Phase 1.1's
 * error-handling completeness review, which found this docblock claiming
 * otherwise. This exception has exactly one call site
 * (DispatchShipmentAction), which catches it and re-throws Fulfillment's
 * own Exceptions\ShipmentValidationException('courier_booking_failed',
 * ...) instead, so it is that mapping (already present in
 * bootstrap/app.php) a caller's 422 response actually comes from — this
 * class never reaches the global exception handler at all.
 */
final class CourierBookingFailedException extends RuntimeException
{
    public function __construct(public readonly string $providerCode, string $reason, ?Throwable $previous = null)
    {
        parent::__construct("Courier [{$providerCode}] could not book this shipment: {$reason}", previous: $previous);
    }
}
