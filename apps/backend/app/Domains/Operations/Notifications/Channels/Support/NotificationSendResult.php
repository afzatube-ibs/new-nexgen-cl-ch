<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Channels\Support;

/**
 * The provider-agnostic outcome every Channels\Contracts\
 * NotificationProviderContract::send() call returns — mirrors Payments'
 * Gateways\Support\GatewayInitiationResult and Shipping's Couriers\
 * Support\ShipmentBookingResult exactly.
 */
final readonly class NotificationSendResult
{
    /**
     * @param  array<string, mixed>  $raw
     */
    public function __construct(
        public string $status,
        public ?string $providerReference,
        public array $raw,
        public ?string $failureReason = null,
    ) {}

    public function succeeded(): bool
    {
        return $this->status === 'succeeded';
    }
}
