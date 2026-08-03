<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Audit\AuditLogger;
use App\Domains\Commerce\Pricing\Exceptions\DependentRecordsExistException;
use App\Domains\Commerce\Pricing\Models\TaxClass;
use App\Domains\Commerce\Pricing\Models\TaxRate;
use Illuminate\Support\Facades\DB;

/**
 * Soft-deletes a TaxClass — DATA:LIFECYCLE's Deleted state. Refuses to
 * delete a class still referenced by a TaxRate — see
 * DeleteTaxZoneAction's identical reasoning.
 */
final readonly class DeleteTaxClassAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(TaxClass $class, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($class, $expectedVersion, $actorId) {
            $class->assertVersionMatches($expectedVersion);

            if (TaxRate::query()->where('tax_class_id', $class->id)->exists()) {
                throw new DependentRecordsExistException(
                    aggregateType: TaxClass::class,
                    aggregateId: $class->id,
                    reason: 'one or more tax rates still reference this class',
                );
            }

            $before = $class->only(['name']);
            $class->delete();

            $this->auditLogger->log(
                action: 'tax_class.deleted',
                actorId: $actorId,
                targetType: TaxClass::class,
                targetId: $class->id,
                before: $before,
            );
        });
    }
}
