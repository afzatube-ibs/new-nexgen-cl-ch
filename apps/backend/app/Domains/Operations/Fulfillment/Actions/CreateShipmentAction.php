<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Actions;

use App\Domains\Operations\Fulfillment\Audit\AuditLogger;
use App\Domains\Operations\Fulfillment\Events\FulfillmentStarted;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use App\Domains\Operations\Fulfillment\Models\ShipmentTimelineEvent;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The operator-facing half of this module's "manual fulfillment actions"
 * Public Contract (per the master plan's Fulfillment entry) — a resilience
 * path for an order placed before this module existed, a backfill, or any
 * case where the automatic Actions\CreateShipmentFromOrderPlacedAction
 * reaction did not run. An operator supplies the same order identifiers
 * OrderPlaced would have carried, read off Orders' own screen — this
 * Action still never queries Orders' data directly, preserving this
 * module's acceptance criterion the same way the automatic path does.
 */
final readonly class CreateShipmentAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): Shipment
    {
        if (Shipment::query()->where('order_id', $attributes['order_id'])->exists()) {
            throw ValidationException::withMessages([
                'order_id' => 'A shipment already exists for this order.',
            ]);
        }

        return DB::transaction(function () use ($attributes, $actorId) {
            $shipment = Shipment::query()->create([
                'order_id' => $attributes['order_id'],
                'order_number' => $attributes['order_number'],
                'customer_id' => $attributes['customer_id'],
                'grand_total' => $attributes['grand_total'] ?? null,
                'currency_code' => $attributes['currency_code'] ?? null,
            ]);

            ShipmentTimelineEvent::query()->create([
                'shipment_id' => $shipment->id,
                'event_type' => ShipmentTimelineEvent::TYPE_SHIPMENT_CREATED,
                'description' => "Fulfillment started manually for order {$shipment->order_number}.",
                'occurred_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'shipment.created',
                actorId: $actorId,
                targetType: Shipment::class,
                targetId: $shipment->id,
                after: $shipment->only(['order_id', 'order_number', 'customer_id', 'status']),
            );

            $this->eventBus->publish(new FulfillmentStarted(
                shipmentId: $shipment->id,
                orderId: $shipment->order_id,
                orderNumber: $shipment->order_number,
            ));

            return $shipment;
        });
    }
}
