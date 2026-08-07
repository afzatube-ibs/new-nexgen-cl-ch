<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published by Actions\SendNotificationAction once a provider confirms a
 * notification was accepted for delivery — named explicitly in the
 * master plan's Notifications entry ("Events: ... publishes
 * NotificationSent, NotificationFailed").
 */
final class NotificationSent extends DomainEvent
{
    public function __construct(
        public readonly string $notificationId,
        public readonly string $channel,
        public readonly string $recipient,
        public readonly string $providerCode,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'notifications.notification.sent';
    }
}
