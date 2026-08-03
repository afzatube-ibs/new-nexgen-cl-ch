<?php

declare(strict_types=1);

namespace App\Domains\Platform\Installer\Exceptions;

use RuntimeException;

/**
 * SECURITY:SECURE_CONFIGURATION and this module's own Security
 * Considerations entry in planning/IMPLEMENTATION_MASTER_PLAN.md ("the
 * installer itself must be disabled or locked after first run") made
 * concrete: thrown whenever an install is attempted after
 * platform_installations already holds its one row. Mapped to HTTP 409 in
 * bootstrap/app.php — the installation resource already exists.
 */
final class AlreadyInstalledException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('This platform has already been installed.');
    }
}
