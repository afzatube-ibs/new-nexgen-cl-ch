<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Exceptions;

use RuntimeException;

/**
 * "This request isn't valid against the current state of things" — e.g.
 * neither a template code nor inline subject/body was supplied, a
 * template does not exist for the requested channel/locale. Mirrors
 * Returns' ReturnValidationException exactly, including the
 * machine-readable `$reasonCode`. Mapped to HTTP 422 in bootstrap/app.php.
 */
final class NotificationValidationException extends RuntimeException
{
    public function __construct(public readonly string $reasonCode, string $message)
    {
        parent::__construct($message);
    }
}
