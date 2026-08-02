<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Exceptions;

use RuntimeException;

/**
 * Thrown by EnsurePermission and any controller-level self-or-manage check
 * (see SessionController) instead of each building its own JSON response —
 * centralizing the shape in exactly one place (bootstrap/app.php's
 * exception rendering) is what keeps API:ERROR_MODEL's "one consistent,
 * platform-wide structure" true by construction rather than by convention
 * two call sites have to remember to follow identically.
 */
final class AuthorizationDeniedException extends RuntimeException
{
    public function __construct(string $message = 'You do not have permission to perform this action.')
    {
        parent::__construct($message);
    }
}
