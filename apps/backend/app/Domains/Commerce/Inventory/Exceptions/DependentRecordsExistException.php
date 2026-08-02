<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Exceptions;

use RuntimeException;

/**
 * PRINCIPLES:EXPLICIT_FAILURE applied to this module's restrictOnDelete
 * foreign keys (a warehouse with stock items still recorded against it).
 * Mapped to HTTP 409 in bootstrap/app.php.
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
