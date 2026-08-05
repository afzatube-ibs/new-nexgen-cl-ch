<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\MarkDeliveredAction once a shipment's delivery is
 * confirmed — named explicitly in the master plan's Fulfillment entry.
 * A future Returns module (`MODULE:RETURNS`, "reacts to Fulfillment ...
 * events") is this event's anticipated subscriber, per that module's own
 * master-plan entry.
 */
final class FulfillmentCompleted extends DomainEvent
{
    public function __construct(
        public readonly string $shipmentId,
        public readonly string $orderId,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'fulfillment.shipment.completed';
    }
}
