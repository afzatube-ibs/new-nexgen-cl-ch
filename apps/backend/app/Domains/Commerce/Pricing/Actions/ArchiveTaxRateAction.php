<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Audit\AuditLogger;
use App\Domains\Commerce\Pricing\Models\TaxRate;
use Illuminate\Support\Facades\DB;

final readonly class ArchiveTaxRateAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(TaxRate $rate, int $expectedVersion, ?string $actorId): TaxRate
    {
        return DB::transaction(function () use ($rate, $expectedVersion, $actorId) {
            $rate->assertVersionMatches($expectedVersion);

            $previousStatus = $rate->status;
            $rate->status = TaxRate::STATUS_ARCHIVED;
            $rate->save();

            $this->auditLogger->log(
                action: 'tax_rate.archived',
                actorId: $actorId,
                targetType: TaxRate::class,
                targetId: $rate->id,
                before: ['status' => $previousStatus],
                after: ['status' => $rate->status],
            );

            return $rate;
        });
    }
}
