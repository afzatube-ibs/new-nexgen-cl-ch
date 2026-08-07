<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Channels\Support;

/**
 * The provider-agnostic shape every Channels\Contracts\
 * NotificationProviderContract::send() call receives — mirrors Payments'
 * Gateways\Support\GatewayInitiationRequest and Shipping's Couriers\
 * Support\ShipmentBookingRequest exactly: a concrete provider never sees
 * a Notification Eloquent model, only these plain, already-resolved
 * values, so no provider implementation can reach into this module's own
 * aggregate.
 */
final readonly class NotificationSendRequest
{
    public function __construct(
        public string $recipient,
        public ?string $subject,
        public string $body,
    ) {}
}
