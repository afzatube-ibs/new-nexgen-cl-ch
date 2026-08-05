<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Actions;

use App\Domains\Operations\Fulfillment\Audit\AuditLogger;
use App\Domains\Operations\Fulfillment\Exceptions\ShipmentValidationException;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use Illuminate\Support\Facades\DB;

/**
 * Operator-entered, per this module's "manual fulfillment actions" Public
 * Contract — OrderPlaced carries no shipping address (see the shipments
 * migration's docblock), so this is the only lawful way a Shipment ever
 * gets one. Permitted any time before dispatch; the destination is fixed
 * the moment a courier is booked or a manual dispatch is recorded.
 */
final readonly class SetShipmentDestinationAction
{
    private const array TRACKED_FIELDS = [
        'destination_recipient_name',
        'destination_phone',
        'destination_address_line1',
        'destination_address_line2',
        'destination_city',
        'destination_region',
        'destination_postal_code',
        'destination_country_code',
        'weight_grams',
    ];

    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(Shipment $shipment, array $attributes, int $expectedVersion, ?string $actorId): Shipment
    {
        if (in_array($shipment->status, [Shipment::STATUS_DISPATCHED, Shipment::STATUS_IN_TRANSIT, Shipment::STATUS_DELIVERED, Shipment::STATUS_FAILED, Shipment::STATUS_CANCELLED], true)) {
            throw new ShipmentValidationException('already_dispatched', "Shipment [{$shipment->id}]'s destination can no longer be changed once dispatched.");
        }

        return DB::transaction(function () use ($shipment, $attributes, $expectedVersion, $actorId) {
            $shipment->assertVersionMatches($expectedVersion);

            $before = $shipment->only(self::TRACKED_FIELDS);
            $shipment->fill($attributes)->save();

            $this->auditLogger->log(
                action: 'shipment.destination_set',
                actorId: $actorId,
                targetType: Shipment::class,
                targetId: $shipment->id,
                before: $before,
                after: $shipment->only(self::TRACKED_FIELDS),
            );

            return $shipment;
        });
    }
}
