<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Domains\Commerce\Customers\Events\CustomerRegistered;
use App\Domains\Operations\Notifications\Actions\QueueNotificationAction;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Throwable;

/**
 * See SendOrderConfirmationOnOrderPlaced's own docblock for the full
 * rationale behind this pattern, including why the try/catch below is
 * load-bearing, not defensive boilerplate. The simplest of these
 * listeners: Events\CustomerRegistered already carries the address to
 * send to directly (per that event's own docblock), so no read-only
 * lookup into another module's data is needed at all.
 *
 * Phase 4.0 Slice 4.1 (Mobile-First Customer Identity) — `$event->email`
 * is now nullable (a customer may register with phone only); this
 * listener simply does nothing when it's absent rather than queuing an
 * email notification to no address. A phone-channel welcome message is
 * real future work for Slice 4.2's OTP module, not invented here.
 */
final readonly class SendWelcomeEmailOnCustomerRegistered
{
    public function __construct(private QueueNotificationAction $queueNotificationAction) {}

    public function handle(CustomerRegistered $event): void
    {
        if ($event->email === null) {
            return;
        }

        try {
            $this->queueNotificationAction->execute(
                channel: NotificationTemplate::CHANNEL_EMAIL,
                recipient: $event->email,
                templateCode: 'customer.welcome',
                mergeData: [],
                relatedType: 'customer',
                relatedId: $event->customerId,
            );
        } catch (Throwable $e) {
            report($e);
        }
    }
}
