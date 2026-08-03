<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Audit\AuditLogger;
use App\Domains\Commerce\Pricing\Models\TaxClass;
use Illuminate\Support\Facades\DB;

final readonly class UpdateTaxClassAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(TaxClass $class, array $changes, int $expectedVersion, ?string $actorId): TaxClass
    {
        return DB::transaction(function () use ($class, $changes, $expectedVersion, $actorId) {
            $class->assertVersionMatches($expectedVersion);

            $before = $class->only(['name']);
            $class->fill($changes)->save();

            $this->auditLogger->log(
                action: 'tax_class.updated',
                actorId: $actorId,
                targetType: TaxClass::class,
                targetId: $class->id,
                before: $before,
                after: $class->only(['name']),
            );

            return $class;
        });
    }
}
