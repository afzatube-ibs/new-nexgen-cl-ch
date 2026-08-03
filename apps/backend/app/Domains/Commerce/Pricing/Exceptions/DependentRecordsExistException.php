<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Exceptions;

use RuntimeException;

/**
 * PRINCIPLES:EXPLICIT_FAILURE applied to this module's restrictOnDelete
 * foreign keys (a TaxZone or TaxClass still referenced by a TaxRate):
 * deleting a record other data still depends on must fail loudly with a
 * clear, typed reason — never a raw database constraint violation
 * surfacing as an unhandled 500. Mapped to HTTP 409 in bootstrap/app.php.
 */
final class DependentRecordsExistException extends RuntimeException
{
    public function __construct(
        public readonly string $aggregateType,
        public readonly string $aggregateId,
        string $reason,
    ) {
        parent::__construct("{$aggregateType} [{$aggregateId}] cannot be deleted: {$reason}");
    }
}
