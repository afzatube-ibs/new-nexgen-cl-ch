<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Audit\AuditLogger;
use App\Domains\Commerce\Pricing\Models\TaxRate;
use Illuminate\Support\Facades\DB;

final readonly class UpdateTaxRateAction
{
    private const array TRACKED_FIELDS = ['tax_zone_id', 'tax_class_id', 'rate'];

    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(TaxRate $rate, array $changes, int $expectedVersion, ?string $actorId): TaxRate
    {
        return DB::transaction(function () use ($rate, $changes, $expectedVersion, $actorId) {
            $rate->assertVersionMatches($expectedVersion);

            $before = $rate->only(self::TRACKED_FIELDS);
            $rate->fill($changes)->save();

            $this->auditLogger->log(
                action: 'tax_rate.updated',
                actorId: $actorId,
                targetType: TaxRate::class,
                targetId: $rate->id,
                before: $before,
                after: $rate->only(self::TRACKED_FIELDS),
            );

            return $rate;
        });
    }
}
