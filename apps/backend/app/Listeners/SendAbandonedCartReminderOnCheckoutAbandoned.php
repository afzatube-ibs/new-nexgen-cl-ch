<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Domains\Commerce\Checkout\Events\CheckoutAbandoned;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use App\Domains\Operations\Notifications\Actions\QueueNotificationAction;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Throwable;

/**
 * See SendOrderConfirmationOnOrderPlaced's own docblock for the full
 * rationale behind this pattern (including why the try/catch below is
 * load-bearing, not defensive boilerplate). Closes the gap named in
 * PRODUCTION_COMPLETION_PLAN_v2.md's Milestone 3: `CheckoutAbandoned` was
 * previously published with no subscriber at all.
 *
 * No real customer authentication exists on the Storefront today (every
 * order is guest checkout, per this session's own confirmed platform
 * state) — so a session's only real, addressable recipient is its own
 * `guest_email`. A session started without one (an address entered on a
 * later step, then abandoned before this field was ever filled) is a
 * genuine no-op, not an error: there is no real address to notify and this
 * listener never fabricates one. `customerId`-attributed sessions will
 * become real recipients once Customer Accounts (Milestone 5) exists.
 */
final readonly class SendAbandonedCartReminderOnCheckoutAbandoned
{
    public function __construct(private QueueNotificationAction $queueNotificationAction) {}

    public function handle(CheckoutAbandoned $event): void
    {
        if ($event->guestEmail === null) {
            return;
        }

        $session = CheckoutSession::query()->with('items')->find($event->sessionId);

        if ($session === null) {
            return;
        }

        try {
            $this->queueNotificationAction->execute(
                channel: NotificationTemplate::CHANNEL_EMAIL,
                recipient: $event->guestEmail,
                templateCode: 'checkout.abandoned',
                mergeData: [
                    'customer_name' => $session->guest_name ?? 'there',
                    'item_count' => $session->items->count(),
                    'grand_total' => $session->grand_total,
                    'currency_code' => $session->currency_code,
                ],
                relatedType: 'checkout_session',
                relatedId: $event->sessionId,
            );
        } catch (Throwable $e) {
            report($e);
        }
    }
}
