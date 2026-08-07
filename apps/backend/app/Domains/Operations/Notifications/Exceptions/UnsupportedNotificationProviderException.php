<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Exceptions;

use RuntimeException;

/**
 * Thrown by Channels\ProviderResolver when the requested provider code is
 * either not registered at all (Providers\NotificationsServiceProvider
 * only registers what config/notifications.php's per-channel provider
 * list names) or is registered but
 * Channels\Contracts\NotificationProviderContract::isAvailable() reports
 * false — most commonly a provider whose required credentials are absent
 * from this deployment's environment (SECURITY:SECRETS_MANAGEMENT).
 * Mapped to HTTP 422 in bootstrap/app.php.
 */
final class UnsupportedNotificationProviderException extends RuntimeException
{
    public function __construct(string $providerCode)
    {
        parent::__construct("Notification provider [{$providerCode}] is not available.");
    }
}
