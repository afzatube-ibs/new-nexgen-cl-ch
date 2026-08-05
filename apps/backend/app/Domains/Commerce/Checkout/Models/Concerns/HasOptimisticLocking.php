<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Models\Concerns;

use App\Domains\Commerce\Checkout\Exceptions\ConcurrencyConflictException;

/**
 * DATA:VERSIONING made concrete for this module — see Pricing's,
 * Promotions', and Orders' identically-shaped trait for the full
 * rationale (each module keeps its own copy per MODULE:PUBLIC_CONTRACT).
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
