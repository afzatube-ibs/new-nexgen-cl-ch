<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Actions;

use App\Domains\Operations\Fulfillment\Audit\AuditLogger;
use App\Domains\Operations\Fulfillment\Exceptions\ShipmentValidationException;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use App\Domains\Operations\Fulfillment\Models\ShipmentTimelineEvent;
use Illuminate\Support\Facades\DB;

/**
 * Pick Workflow, step 1: pending -> picking. Requires at least one
 * Actions\AddShipmentItemAction'd item — picking nothing is not a
 * meaningful warehouse operation, per PRINCIPLES:EXPLICIT_FAILURE.
 */
final readonly class StartPickingAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Shipment $shipment, int $expectedVersion, ?string $actorId): Shipment
    {
        if ($shipment->items()->count() === 0) {
            throw new ShipmentValidationException('no_items', "Shipment [{$shipment->id}] has no items to pick.");
        }

        return DB::transaction(function () use ($shipment, $expectedVersion, $actorId) {
            $shipment->assertVersionMatches($expectedVersion);
            $shipment->assertCanTransitionTo(Shipment::STATUS_PICKING);

            $shipment->status = Shipment::STATUS_PICKING;
            $shipment->save();

            ShipmentTimelineEvent::query()->create([
                'shipment_id' => $shipment->id,
                'event_type' => ShipmentTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => 'Picking started.',
                'occurred_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'shipment.picking_started',
                actorId: $actorId,
                targetType: Shipment::class,
                targetId: $shipment->id,
                after: ['status' => $shipment->status],
            );

            return $shipment;
        });
    }
}
