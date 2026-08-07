<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Payments\Events\PaymentRefunded;
use App\Domains\Operations\Notifications\Actions\QueueNotificationAction;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Throwable;

/**
 * See SendOrderConfirmationOnOrderPlaced's own docblock for the full
 * rationale behind this pattern — the try/catch below is especially
 * load-bearing here: Events\PaymentRefunded is published from inside
 * Actions\RefundPaymentAction's own transaction, which itself runs
 * synchronously inside app/Listeners/ProcessRefundOnReturnResolved.php's
 * own try/catch (see that class's docblock) — an uncaught exception here
 * would be mistaken for the refund itself having failed, incorrectly
 * marking an otherwise-successful RefundRequest as failed via Returns'
 * own Actions\MarkRefundFailedAction.
 */
final readonly class SendRefundConfirmationOnPaymentRefunded
{
    public function __construct(private QueueNotificationAction $queueNotificationAction) {}

    public function handle(PaymentRefunded $event): void
    {
        $order = Order::query()->find($event->orderId);

        if ($order === null) {
            return;
        }

        try {
            $this->queueNotificationAction->execute(
                channel: NotificationTemplate::CHANNEL_EMAIL,
                recipient: $order->customer_email,
                templateCode: 'payment.refunded',
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
