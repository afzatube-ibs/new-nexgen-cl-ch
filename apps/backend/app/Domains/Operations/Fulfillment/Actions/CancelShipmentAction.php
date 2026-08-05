<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Actions;

use App\Domains\Operations\Fulfillment\Audit\AuditLogger;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use App\Domains\Operations\Fulfillment\Models\ShipmentTimelineEvent;
use Illuminate\Support\Facades\DB;

/**
 * Operator-initiated cancellation — only reachable before dispatch (see
 * Models\Shipment::ALLOWED_TRANSITIONS): once a courier has been booked or
 * a manual hand-off recorded, the correct path is Actions\MarkFailedAction
 * or a future Returns module, never silently discarding a record of what
 * already left the warehouse.
 */
final readonly class CancelShipmentAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Shipment $shipment, ?string $reason, int $expectedVersion, ?string $actorId): Shipment
    {
        return DB::transaction(function () use ($shipment, $reason, $expectedVersion, $actorId) {
            $shipment->assertVersionMatches($expectedVersion);
            $shipment->assertCanTransitionTo(Shipment::STATUS_CANCELLED);

            $shipment->status = Shipment::STATUS_CANCELLED;
            $shipment->failure_reason = $reason;
            $shipment->save();

            ShipmentTimelineEvent::query()->create([
                'shipment_id' => $shipment->id,
                'event_type' => ShipmentTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => $reason !== null ? "Cancelled: {$reason}" : 'Cancelled.',
                'occurred_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'shipment.cancelled',
                actorId: $actorId,
                targetType: Shipment::class,
                targetId: $shipment->id,
                after: ['status' => $shipment->status, 'reason' => $reason],
            );

            return $shipment;
        });
    }
}
