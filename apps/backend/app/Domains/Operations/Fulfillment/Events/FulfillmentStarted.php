<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\CreateShipmentFromOrderPlacedAction (and Actions\
 * CreateShipmentAction's manual path) once a Shipment record exists for an
 * order — named explicitly in planning/IMPLEMENTATION_MASTER_PLAN.md's
 * Fulfillment entry ("Events: FulfillmentStarted, FulfillmentCompleted,
 * ShipmentDispatched").
 */
final class FulfillmentStarted extends DomainEvent
{
    public function __construct(
        public readonly string $shipmentId,
        public readonly string $orderId,
        public readonly string $orderNumber,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'fulfillment.shipment.started';
    }
}
