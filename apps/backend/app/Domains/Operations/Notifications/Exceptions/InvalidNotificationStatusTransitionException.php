<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Exceptions;

use RuntimeException;

/**
 * Notification Status Lifecycle guard — a well-formed request naming a
 * real notification and a real transition that is nonetheless not
 * reachable from where it currently stands. Mirrors Returns'
 * InvalidReturnStatusTransitionException exactly. Mapped to HTTP 422 in
 * bootstrap/app.php.
 */
final class InvalidNotificationStatusTransitionException extends RuntimeException
{
    public function __construct(string $notificationId, string $from, string $to)
    {
        parent::__construct("Notification [{$notificationId}] cannot transition from [{$from}] to [{$to}].");
    }
}
