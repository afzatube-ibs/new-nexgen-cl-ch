<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\AttributeGroup;
use Illuminate\Support\Facades\DB;

final readonly class CreateAttributeGroupAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): AttributeGroup
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $group = AttributeGroup::query()->create($attributes);

            $this->auditLogger->log(
                action: 'attribute_group.created',
                actorId: $actorId,
                targetType: AttributeGroup::class,
                targetId: $group->id,
                after: $group->only(['code', 'name', 'position']),
            );

            return $group;
        });
    }
}
