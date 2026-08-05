<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Models\Concerns;

use App\Domains\Operations\Fulfillment\Exceptions\ConcurrencyConflictException;

/**
 * DATA:VERSIONING: "Before a write is accepted, the system must be able to
 * detect whether the aggregate has changed since it was last read by
 * whoever is making the write — and if it has, the conflict must be
 * surfaced explicitly." Each module owns its own copy of this trait per
 * MODULE:PUBLIC_CONTRACT — see Shipping's or Pricing's identically-shaped
 * trait for the full rationale.
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
