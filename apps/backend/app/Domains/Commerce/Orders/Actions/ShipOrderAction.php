<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Actions;

use App\Domains\Commerce\Orders\Audit\AuditLogger;
use App\Domains\Commerce\Orders\Events\OrderStatusChanged;
use App\Domains\Commerce\Orders\Exceptions\InvalidOrderStatusTransitionException;
use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Orders\Models\OrderTimelineEvent;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * "Order status lifecycle": processing -> shipped — see Models\Order's
 * docblock for the full state graph. Carries no tracking-number or
 * carrier fields: that level of shipment detail belongs to the future
 * Shipping & Logistics module (per planning/IMPLEMENTATION_MASTER_PLAN.md);
 * this action only records that the order has shipped.
 */
final readonly class ShipOrderAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(Order $order, int $expectedVersion, ?string $actorId): Order
    {
        return DB::transaction(function () use ($order, $expectedVersion, $actorId) {
            $order->assertVersionMatches($expectedVersion);

            if (! $order->canTransitionTo(Order::STATUS_SHIPPED)) {
                throw new InvalidOrderStatusTransitionException($order->id, $order->status, Order::STATUS_SHIPPED);
            }

            $previousStatus = $order->status;
            $order->status = Order::STATUS_SHIPPED;
            $order->save();

            $order->timelineEvents()->create([
                'event_type' => OrderTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => "Order shipped (was {$previousStatus}).",
                'occurred_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'order.shipped',
                actorId: $actorId,
                targetType: Order::class,
                targetId: $order->id,
                before: ['status' => $previousStatus],
                after: ['status' => $order->status],
            );

            $this->eventBus->publish(new OrderStatusChanged(
                orderId: $order->id,
                fromStatus: $previousStatus,
                toStatus: $order->status,
            ));

            return $order;
        });
    }
}
