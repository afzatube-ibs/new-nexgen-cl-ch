<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Payments\Events\PaymentFailed;
use App\Domains\Operations\Notifications\Actions\QueueNotificationAction;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Throwable;

/**
 * See SendOrderConfirmationOnOrderPlaced's own docblock for the full
 * rationale behind this pattern (including why the try/catch below is
 * load-bearing, not defensive boilerplate). Closes the gap named in
 * PRODUCTION_COMPLETION_PLAN_v2.md's Milestone 3: `PaymentFailed` was
 * previously published with no subscriber at all, so a shopper whose
 * payment failed received no real communication about it.
 *
 * `$event->reason` is already a short, human-readable summary per
 * PaymentFailed's own docblock (never a gateway's raw response) — safe to
 * surface directly to the shopper.
 */
final readonly class SendPaymentFailureNoticeOnPaymentFailed
{
    public function __construct(private QueueNotificationAction $queueNotificationAction) {}

    public function handle(PaymentFailed $event): void
    {
        $order = Order::query()->find($event->orderId);

        if ($order === null) {
            return;
        }

        try {
            $this->queueNotificationAction->execute(
                channel: NotificationTemplate::CHANNEL_EMAIL,
                recipient: $order->customer_email,
                templateCode: 'payment.failed',
                mergeData: [
                    'customer_name' => $order->customer_name,
                    'order_number' => $order->order_number,
                    'reason' => $event->reason,
                ],
                relatedType: 'payment',
                relatedId: $event->paymentId,
            );
        } catch (Throwable $e) {
            report($e);
        }
    }
}
