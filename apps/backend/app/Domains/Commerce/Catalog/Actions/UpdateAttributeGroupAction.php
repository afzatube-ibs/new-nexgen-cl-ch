<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\AttributeGroup;
use Illuminate\Support\Facades\DB;

final readonly class UpdateAttributeGroupAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(AttributeGroup $group, array $changes, int $expectedVersion, ?string $actorId): AttributeGroup
    {
        return DB::transaction(function () use ($group, $changes, $expectedVersion, $actorId) {
            $group->assertVersionMatches($expectedVersion);

            $before = $group->only(['code', 'name', 'position']);
            $group->fill($changes)->save();
            $after = $group->only(['code', 'name', 'position']);

            $this->auditLogger->log(
                action: 'attribute_group.updated',
                actorId: $actorId,
                targetType: AttributeGroup::class,
                targetId: $group->id,
                before: $before,
                after: $after,
            );

            return $group;
        });
    }
}
