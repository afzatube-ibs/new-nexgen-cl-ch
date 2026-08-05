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
 * "Order status lifecycle": pending/confirmed/processing -> cancelled
 * (terminal) — the early-exit branch of Models\Order's state graph. Takes
 * a required `$reason`, recorded on the timeline (unlike every other
 * transition, which is self-explanatory) since a cancellation is the one
 * transition an operator or customer needs a stated reason to justify.
 */
final readonly class CancelOrderAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(Order $order, string $reason, int $expectedVersion, ?string $actorId): Order
    {
        return DB::transaction(function () use ($order, $reason, $expectedVersion, $actorId) {
            $order->assertVersionMatches($expectedVersion);

            if (! $order->canTransitionTo(Order::STATUS_CANCELLED)) {
                throw new InvalidOrderStatusTransitionException($order->id, $order->status, Order::STATUS_CANCELLED);
            }

            $previousStatus = $order->status;
            $order->status = Order::STATUS_CANCELLED;
            $order->save();

            $order->timelineEvents()->create([
                'event_type' => OrderTimelineEvent::TYPE_STATUS_CHANGED,
                'description' => "Order cancelled (was {$previousStatus}): {$reason}",
                'occurred_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'order.cancelled',
                actorId: $actorId,
                targetType: Order::class,
                targetId: $order->id,
                before: ['status' => $previousStatus],
                after: ['status' => $order->status, 'reason' => $reason],
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
