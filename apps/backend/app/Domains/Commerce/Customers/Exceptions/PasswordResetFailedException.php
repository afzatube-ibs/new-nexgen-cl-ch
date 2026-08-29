<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Exceptions;

use RuntimeException;

/**
 * Production Completion Plan v2, Milestone 5b (Password Reset).
 * Deliberately carries no distinguishing detail — an unknown email, an
 * invalid token, and an expired token all map to this identical,
 * generic outward message, for the same anti-enumeration reason
 * Actions\LoginCustomerAction's own `AuthenticationFailedException`
 * does.
 */
final class PasswordResetFailedException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('This password reset link is invalid or has expired.');
    }
}
