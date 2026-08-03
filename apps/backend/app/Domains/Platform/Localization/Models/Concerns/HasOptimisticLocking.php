<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Models\Concerns;

use App\Domains\Platform\Localization\Exceptions\ConcurrencyConflictException;

/**
 * DATA:VERSIONING made concrete for this module — see Store Configuration's
 * identically-named trait for the full rationale. This is a deliberate,
 * independent copy: MODULE:PUBLIC_CONTRACT forbids one module depending on
 * another's internal implementation, and every module that needs
 * optimistic locking owns its own copy of this small amount of logic.
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
