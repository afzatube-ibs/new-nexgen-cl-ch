<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Actions;

use App\Domains\Operations\Fulfillment\Audit\AuditLogger;
use App\Domains\Operations\Fulfillment\Exceptions\ShipmentValidationException;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use App\Domains\Operations\Fulfillment\Models\ShipmentTimelineEvent;
use Illuminate\Support\Facades\DB;

/**
 * Pack Workflow, step 2: packing -> packed. Requires a recorded weight —
 * courier booking (Actions\DispatchShipmentAction) needs it, and a parcel
 * cannot honestly be "packed" without one, per PRINCIPLES:EXPLICIT_FAILURE.
 */
final readonly class MarkPackedAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Shipment $shipment, int $expectedVersion, ?string $actorId): Shipment
    {
        if ($shipment->weight_grams === null) {
            throw new ShipmentValidationException('missing_weight', "Shipment [{$shipment->id}] has no recorded weight — set it via the destination endpoint before marking packed.");
        }

        return DB::transaction(function () use ($shipment, $expectedVersion, $actorId) {
            $shipment->assertVersionMatches($expectedVersion);
            $shipment->assertCanTransitionTo(Shipment::STATUS_PACKED);

            $shipment->status = Shipment::STATUS_PACKED;
            $shipment->packed_at = now();
            $shipment->save();

            ShipmentTimelineEvent::query()->create([
                'shipment_id' => $shipment->id,
                'event_type' => ShipmentTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => 'Packed and ready for dispatch.',
                'occurred_at' => $shipment->packed_at,
            ]);

            $this->auditLogger->log(
                action: 'shipment.packed',
                actorId: $actorId,
                targetType: Shipment::class,
                targetId: $shipment->id,
                after: ['status' => $shipment->status, 'packed_at' => $shipment->packed_at->toIso8601String()],
            );

            return $shipment;
        });
    }
}
