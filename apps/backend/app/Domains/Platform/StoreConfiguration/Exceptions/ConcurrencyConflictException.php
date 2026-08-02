<?php

declare(strict_types=1);

namespace App\Domains\Platform\StoreConfiguration\Exceptions;

use RuntimeException;

/**
 * DATA:VERSIONING made concrete for this module: thrown when a write's
 * expected version no longer matches the aggregate's current version.
 * Mapped to HTTP 409 in bootstrap/app.php.
 *
 * Deliberately its own class rather than importing Identity & Access's
 * exception of the same shape: MODULE:PUBLIC_CONTRACT forbids depending on
 * another module's internal implementation, and optimistic-locking
 * conflict handling was never published as part of Identity & Access's
 * public contract — it is that module's own internal mechanism. This is
 * the same reasoning Authorization\PermissionDefinition's docblock states
 * for why each module defines its own copy of small, module-local
 * infrastructure rather than reaching into another module for it.
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
