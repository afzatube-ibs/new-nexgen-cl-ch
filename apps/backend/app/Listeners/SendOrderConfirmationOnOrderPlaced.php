<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Domains\Commerce\Orders\Events\OrderPlaced;
use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Operations\Notifications\Actions\QueueNotificationAction;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Throwable;

/**
 * The platform's fourth cross-domain event-routing seam (after
 * CreateShipmentOnOrderPlaced, ProcessRefundOnReturnResolved, and
 * CompleteRefundOnPaymentRefunded) — lives outside every domain's own
 * namespace for the identical reason: this class necessarily references
 * both Orders' (Commerce) own event/model and Notifications' (Operations)
 * own Action, which deptrac.yaml's layer separation forbids either
 * domain's own code from doing directly, per
 * ARCH:CROSS_DOMAIN_COMMUNICATION.
 *
 * Resolves the recipient by reading Orders' own `customer_email`/
 * `customer_name` — an immutable snapshot Orders already owns and
 * populates once at order-creation time (see the orders migration's own
 * docblock), never Customers' live profile — per Models\Notification's
 * own docblock, this is also the semantically correct address for a
 * transactional email: the one on file when the order was placed.
 *
 * The try/catch here is load-bearing, not defensive boilerplate:
 * Events\OrderPlaced is published from inside Actions\CreateOrderAction's
 * own transaction, synchronously, on the same in-process event bus every
 * other listener for this event shares (including CreateShipmentOnOrder
 * Placed) — an uncaught exception here (a missing/misconfigured
 * notification template, most commonly) would propagate straight back
 * into CreateOrderAction and fail the order itself. Per this module's own
 * "MUST NOT contain business logic from Orders... Notifications is a
 * consumer of events, never the owner of business workflows" rule, a
 * notification failure must never be able to break the workflow that
 * triggered it — so any failure here is reported (surfaced to the
 * application log, per PRINCIPLES:EXPLICIT_FAILURE) and swallowed, never
 * rethrown. Every one of this module's other seven listeners follows the
 * identical pattern.
 */
final readonly class SendOrderConfirmationOnOrderPlaced
{
    public function __construct(private QueueNotificationAction $queueNotificationAction) {}

    public function handle(OrderPlaced $event): void
    {
        $order = Order::query()->find($event->orderId);

        if ($order === null) {
            return;
        }

        try {
            $this->queueNotificationAction->execute(
                channel: NotificationTemplate::CHANNEL_EMAIL,
                recipient: $order->customer_email,
                templateCode: 'order.confirmation',
                mergeData: [
                    'customer_name' => $order->customer_name,
                    'order_number' => $event->orderNumber,
                    'grand_total' => $event->grandTotal,
                    'currency_code' => $event->currencyCode,
                ],
                relatedType: 'order',
                relatedId: $event->orderId,
            );
        } catch (Throwable $e) {
            report($e);
        }
    }
}
