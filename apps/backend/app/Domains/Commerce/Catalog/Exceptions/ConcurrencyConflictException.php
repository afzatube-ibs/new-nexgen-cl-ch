<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Exceptions;

use RuntimeException;

/**
 * DATA:VERSIONING made concrete for this module: thrown when a write's
 * expected version no longer matches the aggregate's current version.
 * Mapped to HTTP 409 in bootstrap/app.php.
 *
 * Its own class rather than importing another module's exception of the
 * same shape — see Store Configuration's identically-named class for the
 * full rationale (MODULE:PUBLIC_CONTRACT forbids depending on another
 * module's internal implementation, and optimistic-locking conflict
 * handling was never published as part of any module's public contract).
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
