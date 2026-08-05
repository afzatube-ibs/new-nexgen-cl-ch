<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Actions;

use App\Domains\Operations\Fulfillment\Audit\AuditLogger;
use App\Domains\Operations\Fulfillment\Exceptions\ShipmentValidationException;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use App\Domains\Operations\Fulfillment\Models\ShipmentItem;
use Illuminate\Support\Facades\DB;

/**
 * Operator-entered, per this module's "manual fulfillment actions" Public
 * Contract — Fulfillment has no lawful way to read Orders' own line items
 * directly (see the shipment_items migration's docblock). Only permitted
 * before a shipment has been packed: once packing is confirmed, the
 * contents are a settled fact, not something a later edit should quietly
 * change underneath an already-printed pack list.
 */
final readonly class AddShipmentItemAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Shipment $shipment, string $sku, ?string $description, int $quantity, ?string $actorId): ShipmentItem
    {
        if (in_array($shipment->status, [Shipment::STATUS_PACKED, Shipment::STATUS_DISPATCHED, Shipment::STATUS_IN_TRANSIT, Shipment::STATUS_DELIVERED, Shipment::STATUS_FAILED, Shipment::STATUS_CANCELLED], true)) {
            throw new ShipmentValidationException('already_packed', "Shipment [{$shipment->id}] items can no longer be changed once packed.");
        }

        return DB::transaction(function () use ($shipment, $sku, $description, $quantity, $actorId) {
            $item = $shipment->items()->create([
                'sku' => $sku,
                'description' => $description,
                'quantity' => $quantity,
            ]);

            $this->auditLogger->log(
                action: 'shipment_item.added',
                actorId: $actorId,
                targetType: ShipmentItem::class,
                targetId: $item->id,
                after: $item->only(['shipment_id', 'sku', 'description', 'quantity']),
            );

            return $item;
        });
    }
}
