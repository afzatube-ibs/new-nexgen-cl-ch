<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Payments\Events\PaymentCaptured;
use App\Domains\Operations\Notifications\Actions\QueueNotificationAction;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Throwable;

/**
 * See SendOrderConfirmationOnOrderPlaced's own docblock for the full
 * rationale behind this pattern — including why the try/catch below is
 * load-bearing (a notification failure must never propagate back into
 * Payments' own Actions\CapturePaymentAction and fail the capture
 * itself) — and why the recipient is resolved from Orders' own immutable
 * `customer_email` snapshot rather than Payments' or Customers' data.
 */
final readonly class SendPaymentReceiptOnPaymentCaptured
{
    public function __construct(private QueueNotificationAction $queueNotificationAction) {}

    public function handle(PaymentCaptured $event): void
    {
        $order = Order::query()->find($event->orderId);

        if ($order === null) {
            return;
        }

        try {
            $this->queueNotificationAction->execute(
                channel: NotificationTemplate::CHANNEL_EMAIL,
                recipient: $order->customer_email,
                templateCode: 'payment.receipt',
                mergeData: [
                    'customer_name' => $order->customer_name,
                    'order_number' => $order->order_number,
                    'amount' => $event->amount,
                    'currency_code' => $event->currencyCode,
                ],
                relatedType: 'payment',
                relatedId: $event->paymentId,
            );
        } catch (Throwable $e) {
            report($e);
        }
    }
}
