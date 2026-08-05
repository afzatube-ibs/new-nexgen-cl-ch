<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Actions;

use App\Domains\Operations\Fulfillment\Audit\AuditLogger;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use App\Domains\Operations\Fulfillment\Models\ShipmentTimelineEvent;
use Illuminate\Support\Facades\DB;

/**
 * Terminal failure — picking/packing could not be completed, or the
 * courier could not deliver (returned, lost, refused). Re-fulfillment
 * happens by creating a new Shipment (Actions\CreateShipmentAction), never
 * by resurrecting this one, per Models\Shipment's own docblock.
 */
final readonly class MarkFailedAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Shipment $shipment, string $reason, int $expectedVersion, ?string $actorId): Shipment
    {
        return DB::transaction(function () use ($shipment, $reason, $expectedVersion, $actorId) {
            $shipment->assertVersionMatches($expectedVersion);
            $shipment->assertCanTransitionTo(Shipment::STATUS_FAILED);

            $shipment->status = Shipment::STATUS_FAILED;
            $shipment->failure_reason = $reason;
            $shipment->save();

            ShipmentTimelineEvent::query()->create([
                'shipment_id' => $shipment->id,
                'event_type' => ShipmentTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => "Failed: {$reason}",
                'occurred_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'shipment.failed',
                actorId: $actorId,
                targetType: Shipment::class,
                targetId: $shipment->id,
                after: ['status' => $shipment->status, 'failure_reason' => $reason],
            );

            return $shipment;
        });
    }
}
