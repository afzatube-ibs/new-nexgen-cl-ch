<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Actions;

use App\Domains\Operations\Fulfillment\Audit\AuditLogger;
use App\Domains\Operations\Fulfillment\Exceptions\ShipmentValidationException;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use App\Domains\Operations\Fulfillment\Models\ShipmentItem;
use Illuminate\Support\Facades\DB;

final readonly class RemoveShipmentItemAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Shipment $shipment, ShipmentItem $item, ?string $actorId): void
    {
        if (in_array($shipment->status, [Shipment::STATUS_PACKED, Shipment::STATUS_DISPATCHED, Shipment::STATUS_IN_TRANSIT, Shipment::STATUS_DELIVERED, Shipment::STATUS_FAILED, Shipment::STATUS_CANCELLED], true)) {
            throw new ShipmentValidationException('already_packed', "Shipment [{$shipment->id}] items can no longer be changed once packed.");
        }

        DB::transaction(function () use ($item, $actorId): void {
            $before = $item->only(['shipment_id', 'sku', 'description', 'quantity']);
            $item->delete();

            $this->auditLogger->log(
                action: 'shipment_item.removed',
                actorId: $actorId,
                targetType: ShipmentItem::class,
                targetId: $item->id,
                before: $before,
            );
        });
    }
}
