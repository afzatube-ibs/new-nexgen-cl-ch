<?php

declare(strict_types=1);

namespace App\Domains\Platform\Appearance\Models\Concerns;

use App\Domains\Platform\Appearance\Exceptions\ConcurrencyConflictException;

/**
 * DATA:VERSIONING, applied to this module — see `StoreConfiguration`'s
 * identically-shaped concern for the full rationale. Each domain module
 * keeps its own copy rather than sharing one (`MODULE:PUBLIC_CONTRACT`),
 * matching that module's own `Authorization\PermissionDefinition` and
 * `Exceptions\ConcurrencyConflictException` precedent.
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
