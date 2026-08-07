<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Operations\Notifications\Actions\QueueNotificationAction;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use App\Domains\Operations\Returns\Events\RefundIssued;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use Throwable;

/**
 * See SendOrderConfirmationOnOrderPlaced's own docblock for the full
 * rationale behind this pattern — the try/catch below is especially
 * load-bearing here: Events\RefundIssued is published from inside
 * Returns' own Actions\CompleteRefundRequestAction, itself called by
 * app/Listeners/CompleteRefundOnPaymentRefunded.php, itself triggered
 * from inside Payments' Actions\RefundPaymentAction, itself called from
 * inside app/Listeners/ProcessRefundOnReturnResolved.php's own try/catch
 * — an uncaught exception here would unwind through all three layers and
 * be mistaken for the refund itself having failed. Events\RefundIssued
 * does not itself carry an `orderId` (only `returnRequestId`/
 * `refundRequestId`/`paymentId` — see that event's own docblock), so this
 * listener takes one extra hop through Returns' own ReturnRequest before
 * reaching Orders' snapshot — still the same "one neutral listener,
 * several read-only lookups" shape every other listener here uses, not a
 * business decision of its own.
 */
final readonly class SendRefundIssuedOnRefundIssued
{
    public function __construct(private QueueNotificationAction $queueNotificationAction) {}

    public function handle(RefundIssued $event): void
    {
        $returnRequest = ReturnRequest::query()->find($event->returnRequestId);

        if ($returnRequest === null) {
            return;
        }

        $order = Order::query()->find($returnRequest->order_id);

        if ($order === null) {
            return;
        }

        try {
            $this->queueNotificationAction->execute(
                channel: NotificationTemplate::CHANNEL_EMAIL,
                recipient: $order->customer_email,
                templateCode: 'refund.issued',
                mergeData: [
                    'customer_name' => $order->customer_name,
                    'order_number' => $order->order_number,
                    'rma_number' => $returnRequest->rma_number,
                    'amount' => $event->amount,
                    'currency_code' => $event->currencyCode,
                ],
                relatedType: 'return_request',
                relatedId: $event->returnRequestId,
            );
        } catch (Throwable $e) {
            report($e);
        }
    }
}
