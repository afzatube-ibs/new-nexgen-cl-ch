<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Actions;

use App\Domains\Operations\Fulfillment\Audit\AuditLogger;
use App\Domains\Operations\Fulfillment\Events\FulfillmentStarted;
use App\Domains\Operations\Fulfillment\Models\Shipment;
use App\Domains\Operations\Fulfillment\Models\ShipmentTimelineEvent;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * This module's reaction to Orders' `OrderPlaced` event — called only by
 * app/Listeners/CreateShipmentOnOrderPlaced.php (an integration listener
 * living outside every domain's own namespace specifically so that this
 * Action, and every other class Fulfillment owns, never needs to import
 * anything from `App\Domains\Commerce\Orders`, per this module's
 * acceptance criterion: "Fulfillment never depends on Orders' internal
 * data directly — only on the OrderPlaced event." This Action's own
 * signature accepts plain primitives — exactly what that event carries —
 * never the event object itself, keeping that boundary enforceable by
 * deptrac.yaml's static analysis, not merely by convention.
 *
 * Idempotent by design (the shipments table's own `(tenant_id, order_id)`
 * unique constraint, checked here first to keep the common case a normal
 * read rather than a caught constraint violation): a duplicate OrderPlaced
 * delivery — or a manual re-run — never creates a second Shipment for the
 * same order.
 *
 * Deliberately does NOT wait for Payments' `PaymentCaptured` event: Cash
 * On Delivery — this platform's Bangladesh-first, first-class gateway
 * (Payments\Gateways\CodGateway) — only captures payment once cash is
 * collected at delivery, which happens *after* a shipment has already
 * gone out. Waiting for PaymentCaptured before starting fulfillment would
 * make COD orders unfulfillable, and docs/04_MODULE_ARCHITECTURE.md's own
 * `MODULE:FULFILLMENT` boundary text names only OrderPlaced as this
 * module's trigger.
 */
final readonly class CreateShipmentFromOrderPlacedAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(
        string $orderId,
        string $orderNumber,
        string $customerId,
        ?string $grandTotal,
        ?string $currencyCode,
    ): Shipment {
        $existing = Shipment::query()->where('order_id', $orderId)->first();

        if ($existing !== null) {
            return $existing;
        }

        return DB::transaction(function () use ($orderId, $orderNumber, $customerId, $grandTotal, $currencyCode) {
            $shipment = Shipment::query()->create([
                'order_id' => $orderId,
                'order_number' => $orderNumber,
                'customer_id' => $customerId,
                'grand_total' => $grandTotal,
                'currency_code' => $currencyCode,
            ]);

            ShipmentTimelineEvent::query()->create([
                'shipment_id' => $shipment->id,
                'event_type' => ShipmentTimelineEvent::TYPE_SHIPMENT_CREATED,
                'description' => "Fulfillment started for order {$orderNumber}.",
                'occurred_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'shipment.created',
                actorId: null,
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
