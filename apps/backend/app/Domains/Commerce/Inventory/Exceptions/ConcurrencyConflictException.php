<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Exceptions;

use RuntimeException;

/**
 * DATA:VERSIONING made concrete for this module — see Store
 * Configuration's identically-shaped exception for the full rationale
 * behind each module keeping its own copy.
 */
final class ConcurrencyConflictException extends RuntimeException
{
    public function __construct(
        public readonly string $aggregateType,
        public readonly string $aggregateId,
        public readonly int $expectedVersion,
        public readonly int $actualVersion,
    ) {
        parent::__construct(sprintf(
            '%s [%s] has changed since it was last read: expected version %d, found %d.',
            $aggregateType,
            $aggregateId,
            $expectedVersion,
            $actualVersion,
        ));
    }
}
