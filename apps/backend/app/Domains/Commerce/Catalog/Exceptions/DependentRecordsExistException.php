<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Exceptions;

use RuntimeException;

/**
 * PRINCIPLES:EXPLICIT_FAILURE applied to every restrictOnDelete foreign key
 * this module's schema declares (a category with children, an Attribute
 * still valued on a product, an Option or OptionValue still assigned to a
 * product/variant): deleting a record other data still depends on must
 * fail loudly with a clear, typed reason — never a raw database constraint
 * violation surfacing as an unhandled 500. Mapped to HTTP 409 in
 * bootstrap/app.php.
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
