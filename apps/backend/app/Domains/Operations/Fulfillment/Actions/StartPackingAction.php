<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Actions;

use App\Domains\Operations\Fulfillment\Audit\AuditLogger;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use App\Domains\Operations\Fulfillment\Models\ShipmentTimelineEvent;
use Illuminate\Support\Facades\DB;

/**
 * Pack Workflow, step 1: picked -> packing.
 */
final readonly class StartPackingAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Shipment $shipment, int $expectedVersion, ?string $actorId): Shipment
    {
        return DB::transaction(function () use ($shipment, $expectedVersion, $actorId) {
            $shipment->assertVersionMatches($expectedVersion);
            $shipment->assertCanTransitionTo(Shipment::STATUS_PACKING);

            $shipment->status = Shipment::STATUS_PACKING;
            $shipment->save();

            ShipmentTimelineEvent::query()->create([
                'shipment_id' => $shipment->id,
                'event_type' => ShipmentTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => 'Packing started.',
                'occurred_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'shipment.packing_started',
                actorId: $actorId,
                targetType: Shipment::class,
                targetId: $shipment->id,
                after: ['status' => $shipment->status],
            );

            return $shipment;
        });
    }
}
