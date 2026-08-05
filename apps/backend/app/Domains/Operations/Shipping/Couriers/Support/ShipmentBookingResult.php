<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Couriers\Support;

/**
 * Output of Contracts\ShippingProviderContract::bookShipment() on success.
 */
final readonly class ShipmentBookingResult
{
    public function __construct(
        public string $courierConsignmentId,
        public string $trackingNumber,
        public ?string $labelUrl,
        /** @var array<string, mixed> */
        public array $raw = [],
    ) {}
}
