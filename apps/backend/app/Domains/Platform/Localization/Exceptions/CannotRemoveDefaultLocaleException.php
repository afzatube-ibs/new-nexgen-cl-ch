<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Exceptions;

use RuntimeException;

/**
 * The platform's default locale is load-bearing for every future
 * customer-facing surface that falls back to it when no other locale
 * applies — archiving or deleting it while it still holds that role would
 * leave the installation without a defined fallback. An operator must
 * promote a different locale to default first. Mapped to HTTP 422 in
 * bootstrap/app.php: a well-formed request that violates a business rule,
 * not a validation or version-conflict failure.
 */
final class CannotRemoveDefaultLocaleException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Cannot archive or delete the default locale. Promote a different locale to default first.');
    }
}
