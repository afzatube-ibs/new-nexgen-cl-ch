<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Exceptions;

use RuntimeException;

/**
 * Every other currency's exchange_rate is expressed relative to whichever
 * Currency holds `is_base` — archiving or deleting that currency would
 * leave every other rate meaningless. An operator must promote a
 * different currency to base first. Mapped to HTTP 422 in
 * bootstrap/app.php: a well-formed request that violates a business rule,
 * not a validation or version-conflict failure.
 */
final class CannotRemoveBaseCurrencyException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Cannot archive or delete the base currency. Promote a different currency to base first.');
    }
}
