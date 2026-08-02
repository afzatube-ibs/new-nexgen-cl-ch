<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Exceptions;

use RuntimeException;

/**
 * Deliberately carries no distinguishing detail — see
 * AuthenticateUserAction's docblock for why every failure reason maps to
 * the same caller-facing outcome.
 */
final class AuthenticationFailedException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('The provided credentials are incorrect.');
    }
}
