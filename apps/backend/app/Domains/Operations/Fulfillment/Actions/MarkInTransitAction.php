<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Actions;

use App\Domains\Operations\Fulfillment\Audit\AuditLogger;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use App\Domains\Operations\Fulfillment\Models\ShipmentTimelineEvent;
use Illuminate\Support\Facades\DB;

/**
 * Delivery Progress: dispatched -> in_transit. An operator-facing status
 * update reflecting the courier's own progress (no courier shipped with
 * this module publishes a tracking webhook this platform could react to
 * automatically — see config/shipping.php's docblock), matching this
 * module's own Public Contract of "manual fulfillment actions" for
 * anything beyond the courier-booking call itself.
 */
final readonly class MarkInTransitAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Shipment $shipment, int $expectedVersion, ?string $actorId): Shipment
    {
        return DB::transaction(function () use ($shipment, $expectedVersion, $actorId) {
            $shipment->assertVersionMatches($expectedVersion);
            $shipment->assertCanTransitionTo(Shipment::STATUS_IN_TRANSIT);

            $shipment->status = Shipment::STATUS_IN_TRANSIT;
            $shipment->save();

            ShipmentTimelineEvent::query()->create([
                'shipment_id' => $shipment->id,
                'event_type' => ShipmentTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => 'In transit with the courier.',
                'occurred_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'shipment.in_transit',
                actorId: $actorId,
                targetType: Shipment::class,
                targetId: $shipment->id,
                after: ['status' => $shipment->status],
            );

            return $shipment;
        });
    }
}
