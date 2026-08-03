<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Audit\AuditLogger;
use App\Domains\Commerce\Pricing\Models\TaxZone;
use Illuminate\Support\Facades\DB;

final readonly class CreateTaxZoneAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): TaxZone
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $zone = TaxZone::query()->create([
                'name' => $attributes['name'],
                'country_code' => $attributes['country_code'],
                'region' => $attributes['region'] ?? '',
            ]);

            $this->auditLogger->log(
                action: 'tax_zone.created',
                actorId: $actorId,
                targetType: TaxZone::class,
                targetId: $zone->id,
                after: $zone->only(['name', 'country_code', 'region', 'status']),
            );

            return $zone;
        });
    }
}
