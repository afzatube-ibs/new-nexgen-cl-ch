<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Exceptions;

use RuntimeException;

/**
 * Raised when completing or cancelling a StockTransfer that is not
 * `pending`. Mapped to HTTP 409 in bootstrap/app.php.
 */
final class InvalidTransferStateException extends RuntimeException
{
    public function __construct(public readonly string $transferId, public readonly string $currentStatus)
    {
        parent::__construct("Stock transfer [{$transferId}] is already [{$currentStatus}] and cannot be changed.");
    }
}
