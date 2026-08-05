<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Actions;

use App\Domains\Operations\Fulfillment\Audit\AuditLogger;
use App\Domains\Operations\Fulfillment\Events\FulfillmentCompleted;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use App\Domains\Operations\Fulfillment\Models\ShipmentTimelineEvent;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * Delivery Confirmation: dispatched or in_transit -> delivered. This
 * module's success terminal state — publishes FulfillmentCompleted, named
 * explicitly in the master plan's Fulfillment entry.
 */
final readonly class MarkDeliveredAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(Shipment $shipment, int $expectedVersion, ?string $actorId): Shipment
    {
        return DB::transaction(function () use ($shipment, $expectedVersion, $actorId) {
            $shipment->assertVersionMatches($expectedVersion);
            $shipment->assertCanTransitionTo(Shipment::STATUS_DELIVERED);

            $shipment->status = Shipment::STATUS_DELIVERED;
            $shipment->delivered_at = now();
            $shipment->save();

            ShipmentTimelineEvent::query()->create([
                'shipment_id' => $shipment->id,
                'event_type' => ShipmentTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => 'Delivered.',
                'occurred_at' => $shipment->delivered_at,
            ]);

            $this->auditLogger->log(
                action: 'shipment.delivered',
                actorId: $actorId,
                targetType: Shipment::class,
                targetId: $shipment->id,
                after: ['status' => $shipment->status, 'delivered_at' => $shipment->delivered_at->toIso8601String()],
            );

            $this->eventBus->publish(new FulfillmentCompleted(
                shipmentId: $shipment->id,
                orderId: $shipment->order_id,
            ));

            return $shipment;
        });
    }
}
