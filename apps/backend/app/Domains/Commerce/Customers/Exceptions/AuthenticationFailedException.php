<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Exceptions;

use RuntimeException;

/**
 * Deliberately carries no distinguishing detail — see
 * Actions\LoginCustomerAction's docblock for why every failure reason
 * maps to the same caller-facing outcome. Mirrors Identity & Access's own
 * `AuthenticationFailedException`; not reused directly since Customers
 * "never depends on... Identity & Access... internals"
 * (tests/Arch/ArchitectureTest.php).
 */
final class AuthenticationFailedException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('The provided credentials are incorrect.');
    }
}
