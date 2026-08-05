<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Exceptions;

use RuntimeException;

/**
 * DATA:VERSIONING made concrete for this module — see every other
 * module's identically-shaped exception for the full rationale (each
 * module owns its own copy per MODULE:PUBLIC_CONTRACT). Mapped to HTTP
 * 409 in bootstrap/app.php.
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
