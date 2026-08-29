<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Domains\Commerce\Orders\Events\OrderStatusChanged;
use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Operations\Notifications\Actions\QueueNotificationAction;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Throwable;

/**
 * See SendOrderConfirmationOnOrderPlaced's own docblock for the full
 * rationale behind this pattern (including why the try/catch below is
 * load-bearing, not defensive boilerplate).
 *
 * `OrderStatusChanged` fires for every real transition (confirmed,
 * processing, shipped, delivered, cancelled — see that event's own
 * docblock) — this listener is deliberately narrow, only ever acting on
 * the one transition a shopper needs proactively notified about that no
 * other listener already covers (dispatch and delivery already have their
 * own dedicated Fulfillment-side events/listeners). Every other
 * transition is a genuine, silent no-op here, not a missed case.
 */
final readonly class SendOrderCancellationNoticeOnOrderStatusChanged
{
    public function __construct(private QueueNotificationAction $queueNotificationAction) {}

    public function handle(OrderStatusChanged $event): void
    {
        if ($event->toStatus !== Order::STATUS_CANCELLED) {
            return;
        }

        $order = Order::query()->find($event->orderId);

        if ($order === null) {
            return;
        }

        try {
            $this->queueNotificationAction->execute(
                channel: NotificationTemplate::CHANNEL_EMAIL,
                recipient: $order->customer_email,
                templateCode: 'order.cancelled',
                mergeData: [
                    'customer_name' => $order->customer_name,
                    'order_number' => $order->order_number,
                ],
                relatedType: 'order',
                relatedId: $event->orderId,
            );
        } catch (Throwable $e) {
            report($e);
        }
    }
}
