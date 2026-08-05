<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\DispatchShipmentAction once a shipment has handed
 * off to a courier (or been marked dispatched under manual/self-managed
 * fulfillment) — named explicitly in the master plan's Fulfillment entry.
 * A future Notifications module is this event's anticipated first real
 * subscriber ("shipment dispatched" customer notification), not built in
 * this delivery, per the same "publish what happened, leave the reaction
 * to whichever module owns it" pattern Payments' PaymentCaptured docblock
 * already establishes.
 */
final class ShipmentDispatched extends DomainEvent
{
    public function __construct(
        public readonly string $shipmentId,
        public readonly string $orderId,
        public readonly ?string $courierProviderCode,
        public readonly ?string $trackingNumber,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'fulfillment.shipment.dispatched';
    }
}
