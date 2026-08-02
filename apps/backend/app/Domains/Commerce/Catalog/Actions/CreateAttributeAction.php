<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Attribute;
use Illuminate\Support\Facades\DB;

final readonly class CreateAttributeAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): Attribute
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $attribute = Attribute::query()->create($attributes);

            $this->auditLogger->log(
                action: 'attribute.created',
                actorId: $actorId,
                targetType: Attribute::class,
                targetId: $attribute->id,
                after: $attribute->only(['attribute_group_id', 'code', 'name', 'type', 'is_filterable']),
            );

            return $attribute;
        });
    }
}
