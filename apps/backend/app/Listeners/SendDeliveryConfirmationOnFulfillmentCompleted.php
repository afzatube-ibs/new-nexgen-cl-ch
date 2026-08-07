<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Operations\Fulfillment\Events\FulfillmentCompleted;
use App\Domains\Operations\Notifications\Actions\QueueNotificationAction;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Throwable;

/**
 * See SendOrderConfirmationOnOrderPlaced's own docblock for the full
 * rationale behind this pattern, including why the try/catch below is
 * load-bearing, not defensive boilerplate.
 */
final readonly class SendDeliveryConfirmationOnFulfillmentCompleted
{
    public function __construct(private QueueNotificationAction $queueNotificationAction) {}

    public function handle(FulfillmentCompleted $event): void
    {
        $order = Order::query()->find($event->orderId);

        if ($order === null) {
            return;
        }

        try {
            $this->queueNotificationAction->execute(
                channel: NotificationTemplate::CHANNEL_EMAIL,
                recipient: $order->customer_email,
                templateCode: 'shipment.delivered',
                mergeData: [
                    'customer_name' => $order->customer_name,
                    'order_number' => $order->order_number,
                ],
                relatedType: 'shipment',
                relatedId: $event->shipmentId,
            );
        } catch (Throwable $e) {
            report($e);
        }
    }
}
