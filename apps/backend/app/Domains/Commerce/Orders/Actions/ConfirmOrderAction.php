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
 * "Order status lifecycle": pending -> confirmed — see Models\Order's
 * docblock for the full state graph.
 */
final readonly class ConfirmOrderAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(Order $order, int $expectedVersion, ?string $actorId): Order
    {
        return DB::transaction(function () use ($order, $expectedVersion, $actorId) {
            $order->assertVersionMatches($expectedVersion);

            if (! $order->canTransitionTo(Order::STATUS_CONFIRMED)) {
                throw new InvalidOrderStatusTransitionException($order->id, $order->status, Order::STATUS_CONFIRMED);
            }

            $previousStatus = $order->status;
            $order->status = Order::STATUS_CONFIRMED;
            $order->save();

            $order->timelineEvents()->create([
                'event_type' => OrderTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => "Order confirmed (was {$previousStatus}).",
                'occurred_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'order.confirmed',
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
