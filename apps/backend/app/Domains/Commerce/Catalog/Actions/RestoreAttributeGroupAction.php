<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\AttributeGroup;
use Illuminate\Support\Facades\DB;

final readonly class RestoreAttributeGroupAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(AttributeGroup $group, ?string $actorId): AttributeGroup
    {
        return DB::transaction(function () use ($group, $actorId) {
            $group->restore();

            $this->auditLogger->log(
                action: 'attribute_group.restored',
                actorId: $actorId,
                targetType: AttributeGroup::class,
                targetId: $group->id,
                after: $group->only(['code', 'name']),
            );

            return $group;
        });
    }
}
