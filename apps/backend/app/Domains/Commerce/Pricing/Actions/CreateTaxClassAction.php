<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Audit\AuditLogger;
use App\Domains\Commerce\Pricing\Models\TaxClass;
use Illuminate\Support\Facades\DB;

final readonly class CreateTaxClassAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): TaxClass
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $class = TaxClass::query()->create([
                'name' => $attributes['name'],
            ]);

            $this->auditLogger->log(
                action: 'tax_class.created',
                actorId: $actorId,
                targetType: TaxClass::class,
                targetId: $class->id,
                after: $class->only(['name', 'status']),
            );

            return $class;
        });
    }
}
