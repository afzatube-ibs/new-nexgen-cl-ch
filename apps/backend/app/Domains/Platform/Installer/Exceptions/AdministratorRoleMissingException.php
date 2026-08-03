<?php

declare(strict_types=1);

namespace App\Domains\Platform\Installer\Exceptions;

use RuntimeException;

/**
 * Thrown when an install is attempted before the "administrator" role
 * exists — the same precondition Identity & Access's own
 * Console\Commands\CreateAdminCommand checks, since this action ultimately
 * grants that same role. Reachable only if `php artisan db:seed` has not
 * yet run against a freshly migrated database; PRINCIPLES:EXPLICIT_FAILURE
 * requires this be a clear, actionable error rather than a null-reference
 * crash. Mapped to HTTP 503 in bootstrap/app.php — the platform is not yet
 * ready to be installed, not a fault of the caller's request.
 */
final class AdministratorRoleMissingException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('The platform is not ready to be installed: the "administrator" role does not exist yet. Run `php artisan db:seed` first.');
    }
}
