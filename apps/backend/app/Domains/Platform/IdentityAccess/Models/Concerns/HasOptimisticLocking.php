<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Models\Concerns;

use App\Domains\Platform\IdentityAccess\Exceptions\ConcurrencyConflictException;

/**
 * DATA:VERSIONING: "Before a write is accepted, the system must be able to
 * detect whether the aggregate has changed since it was last read by
 * whoever is making the write — and if it has, the conflict must be
 * surfaced explicitly."
 *
 * Every model using this trait carries a `lock_version` column, incremented
 * automatically on every update (never on creation — a row's first version
 * is 1, set by the migration's column default). A caller intending to
 * update the aggregate must call assertVersionMatches() with the version it
 * last read, before applying any change.
 */
trait HasOptimisticLocking
{
    public static function bootHasOptimisticLocking(): void
    {
        static::updating(function ($model): void {
            $model->lock_version = $model->getOriginal('lock_version') + 1;
        });
    }

    public function assertVersionMatches(int $expectedVersion): void
    {
        $actualVersion = (int) $this->getAttribute('lock_version');

        if ($expectedVersion !== $actualVersion) {
            throw new ConcurrencyConflictException(
                aggregateType: static::class,
                aggregateId: (string) $this->getKey(),
                expectedVersion: $expectedVersion,
                actualVersion: $actualVersion,
            );
        }
    }
}
