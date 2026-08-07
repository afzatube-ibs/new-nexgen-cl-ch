<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Operations\Fulfillment\Events\ShipmentDispatched;
use App\Domains\Operations\Notifications\Actions\QueueNotificationAction;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Throwable;

/**
 * See SendOrderConfirmationOnOrderPlaced's own docblock for the full
 * rationale behind this pattern (including why the try/catch below is
 * load-bearing, not defensive boilerplate) — here bridging Operations
 * (Fulfillment's own event) to Operations (Notifications), by way of
 * Commerce (Orders' snapshot), all within one neutral listener.
 */
final readonly class SendShipmentNoticeOnShipmentDispatched
{
    public function __construct(private QueueNotificationAction $queueNotificationAction) {}

    public function handle(ShipmentDispatched $event): void
    {
        $order = Order::query()->find($event->orderId);

        if ($order === null) {
            return;
        }

        try {
            $this->queueNotificationAction->execute(
                channel: NotificationTemplate::CHANNEL_EMAIL,
                recipient: $order->customer_email,
                templateCode: 'shipment.dispatched',
                mergeData: [
                    'customer_name' => $order->customer_name,
                    'order_number' => $order->order_number,
                    'tracking_number' => $event->trackingNumber ?? 'N/A',
                    'courier' => $event->courierProviderCode ?? 'N/A',
                ],
                relatedType: 'shipment',
                relatedId: $event->shipmentId,
            );
        } catch (Throwable $e) {
            report($e);
        }
    }
}
