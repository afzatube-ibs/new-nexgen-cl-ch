<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Couriers\Support;

/**
 * Input to Contracts\ShippingProviderContract::bookShipment() — the
 * provider-agnostic shape every courier's real "create consignment" API
 * is mapped to/from, so Fulfillment (this contract's caller, per that
 * module's own "Fulfillment MUST use Shipping's provider contract, no
 * courier-specific business logic inside Fulfillment" requirement) never
 * needs to know any individual courier's own field names.
 */
final readonly class ShipmentBookingRequest
{
    public function __construct(
        public string $invoiceReference,
        public string $recipientName,
        public string $recipientPhone,
        public string $addressLine1,
        public ?string $addressLine2,
        public string $city,
        public string $region,
        public ?string $postalCode,
        public string $countryCode,
        public ?string $itemDescription,
        public int $weightGrams,
        public string $codAmount,
    ) {}
}
