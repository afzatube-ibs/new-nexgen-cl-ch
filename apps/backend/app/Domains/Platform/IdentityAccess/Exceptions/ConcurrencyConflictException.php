<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Exceptions;

use RuntimeException;

/**
 * DATA:VERSIONING made concrete: thrown when a write's expected version no
 * longer matches the aggregate's current version, meaning the aggregate
 * changed since whoever is writing last read it. Mapped to HTTP 409 at the
 * API layer (see Http\Controllers) — per PRINCIPLES:EXPLICIT_FAILURE, this
 * is surfaced to the caller explicitly, never silently overwritten and
 * never silently discarded.
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
