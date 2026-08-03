<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Audit\AuditLogger;
use App\Domains\Commerce\Pricing\Models\TaxClass;
use Illuminate\Support\Facades\DB;

final readonly class ArchiveTaxClassAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(TaxClass $class, int $expectedVersion, ?string $actorId): TaxClass
    {
        return DB::transaction(function () use ($class, $expectedVersion, $actorId) {
            $class->assertVersionMatches($expectedVersion);

            $previousStatus = $class->status;
            $class->status = TaxClass::STATUS_ARCHIVED;
            $class->save();

            $this->auditLogger->log(
                action: 'tax_class.archived',
                actorId: $actorId,
                targetType: TaxClass::class,
                targetId: $class->id,
                before: ['status' => $previousStatus],
                after: ['status' => $class->status],
            );

            return $class;
        });
    }
}
