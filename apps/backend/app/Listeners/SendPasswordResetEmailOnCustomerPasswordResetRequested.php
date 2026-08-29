<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Domains\Commerce\Customers\Events\CustomerPasswordResetRequested;
use App\Domains\Operations\Notifications\Actions\QueueNotificationAction;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Throwable;

/**
 * Production Completion Plan v2, Milestone 5b (Password Reset). See
 * SendOrderConfirmationOnOrderPlaced's own docblock for the full
 * rationale behind this pattern (including why the try/catch below is
 * load-bearing, not defensive boilerplate).
 *
 * The one real place this platform ever puts a genuinely usable
 * credential fragment (the plaintext reset token, embedded in a real
 * Storefront URL) into a queued notification — see
 * `CustomerPasswordResetRequested`'s own docblock for why that is a
 * deliberate, scoped exception, not a precedent for any other event.
 * `NEXT_PUBLIC_SITE_URL` is this backend's own configured value for the
 * real Storefront origin (the same value the Storefront's own root
 * layout already uses for its `metadataBase`), never hardcoded.
 */
final readonly class SendPasswordResetEmailOnCustomerPasswordResetRequested
{
    public function __construct(private QueueNotificationAction $queueNotificationAction) {}

    public function handle(CustomerPasswordResetRequested $event): void
    {
        $storefrontUrl = rtrim((string) config('app.storefront_url'), '/');
        $resetUrl = sprintf('%s/reset-password?email=%s&token=%s', $storefrontUrl, urlencode($event->email), urlencode($event->plainTextToken));

        try {
            $this->queueNotificationAction->execute(
                channel: NotificationTemplate::CHANNEL_EMAIL,
                recipient: $event->email,
                templateCode: 'customer.password_reset',
                mergeData: [
                    'reset_url' => $resetUrl,
                ],
                relatedType: 'customer',
                relatedId: $event->customerId,
            );
        } catch (Throwable $e) {
            report($e);
        }
    }
}
