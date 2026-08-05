<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Actions;

use App\Domains\Operations\Fulfillment\Audit\AuditLogger;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use App\Domains\Operations\Fulfillment\Models\ShipmentTimelineEvent;
use Illuminate\Support\Facades\DB;

/**
 * Pick Workflow, step 2: picking -> picked.
 */
final readonly class MarkPickedAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Shipment $shipment, int $expectedVersion, ?string $actorId): Shipment
    {
        return DB::transaction(function () use ($shipment, $expectedVersion, $actorId) {
            $shipment->assertVersionMatches($expectedVersion);
            $shipment->assertCanTransitionTo(Shipment::STATUS_PICKED);

            $shipment->status = Shipment::STATUS_PICKED;
            $shipment->picked_at = now();
            $shipment->save();

            ShipmentTimelineEvent::query()->create([
                'shipment_id' => $shipment->id,
                'event_type' => ShipmentTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => 'All items picked.',
                'occurred_at' => $shipment->picked_at,
            ]);

            $this->auditLogger->log(
                action: 'shipment.picked',
                actorId: $actorId,
                targetType: Shipment::class,
                targetId: $shipment->id,
                after: ['status' => $shipment->status, 'picked_at' => $shipment->picked_at->toIso8601String()],
            );

            return $shipment;
        });
    }
}
