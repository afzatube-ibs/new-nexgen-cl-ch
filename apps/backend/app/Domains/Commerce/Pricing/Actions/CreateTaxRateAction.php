<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Audit\AuditLogger;
use App\Domains\Commerce\Pricing\Models\TaxRate;
use Illuminate\Support\Facades\DB;

final readonly class CreateTaxRateAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): TaxRate
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $rate = TaxRate::query()->create([
                'tax_zone_id' => $attributes['tax_zone_id'],
                'tax_class_id' => $attributes['tax_class_id'],
                'rate' => $attributes['rate'],
            ]);

            $this->auditLogger->log(
                action: 'tax_rate.created',
                actorId: $actorId,
                targetType: TaxRate::class,
                targetId: $rate->id,
                after: $rate->only(['tax_zone_id', 'tax_class_id', 'rate', 'status']),
            );

            return $rate;
        });
    }
}
