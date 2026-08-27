<?php

declare(strict_types=1);

namespace App\Domains\Platform\Appearance\Exceptions;

use RuntimeException;

/**
 * DATA:VERSIONING made concrete for this module. Mapped to HTTP 409 in
 * `bootstrap/app.php`. Its own copy, not a shared one — see
 * `StoreConfiguration\Exceptions\ConcurrencyConflictException`'s own
 * docblock for why every module keeps this small, module-local.
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
