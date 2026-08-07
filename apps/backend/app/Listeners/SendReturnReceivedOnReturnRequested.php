<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Operations\Notifications\Actions\QueueNotificationAction;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use App\Domains\Operations\Returns\Events\ReturnRequested;
use Throwable;

/**
 * See SendOrderConfirmationOnOrderPlaced's own docblock for the full
 * rationale behind this pattern, including why the try/catch below is
 * load-bearing (Events\ReturnRequested is published from inside
 * Actions\CreateReturnRequestAction's own transaction — an uncaught
 * exception here would fail the return request itself) — here bridging
 * Operations (Returns' own event) to Operations (Notifications), by way
 * of Commerce (Orders' snapshot), all within one neutral listener,
 * exactly like SendShipmentNoticeOnShipmentDispatched.
 */
final readonly class SendReturnReceivedOnReturnRequested
{
    public function __construct(private QueueNotificationAction $queueNotificationAction) {}

    public function handle(ReturnRequested $event): void
    {
        $order = Order::query()->find($event->orderId);

        if ($order === null) {
            return;
        }

        try {
            $this->queueNotificationAction->execute(
                channel: NotificationTemplate::CHANNEL_EMAIL,
                recipient: $order->customer_email,
                templateCode: 'return.requested',
                mergeData: [
                    'customer_name' => $order->customer_name,
                    'order_number' => $order->order_number,
                    'rma_number' => $event->rmaNumber,
                ],
                relatedType: 'return_request',
                relatedId: $event->returnRequestId,
            );
        } catch (Throwable $e) {
            report($e);
        }
    }
}
