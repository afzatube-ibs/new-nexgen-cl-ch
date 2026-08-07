<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\SendNotificationAction once a notification has
 * exhausted its retry policy (Models\Notification::hasExhaustedRetries())
 * and is permanently failed — named explicitly in the master plan's
 * Notifications entry. Per PRINCIPLES:EXPLICIT_FAILURE ("A notification
 * failure never silently disappears — it is logged, retryable, and
 * surfaced"), this is the "surfaced" half: a subscriber (e.g. a future
 * Growth-domain alerting capability) can react to a permanently failed
 * notification without polling this module's own tables.
 */
final class NotificationFailed extends DomainEvent
{
    public function __construct(
        public readonly string $notificationId,
        public readonly string $channel,
        public readonly string $recipient,
        public readonly string $failureReason,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'notifications.notification.failed';
    }
}
