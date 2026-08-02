<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Attribute;
use App\Domains\Commerce\Catalog\Models\AttributeGroup;
use Illuminate\Support\Facades\DB;

final readonly class DeleteAttributeGroupAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(AttributeGroup $group, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($group, $expectedVersion, $actorId) {
            $group->assertVersionMatches($expectedVersion);

            // The attributes migration's attribute_group_id foreign key is
            // nullOnDelete, but that only fires on a real row deletion —
            // AttributeGroup uses SoftDeletes, so the row never physically
            // disappears and the database-level cascade never triggers.
            // Ungrouping every Attribute explicitly here is what actually
            // makes "ungrouped, not deleted" true.
            Attribute::query()->where('attribute_group_id', $group->id)->update(['attribute_group_id' => null]);

            $before = $group->only(['code', 'name']);
            $group->delete();

            $this->auditLogger->log(
                action: 'attribute_group.deleted',
                actorId: $actorId,
                targetType: AttributeGroup::class,
                targetId: $group->id,
                before: $before,
            );
        });
    }
}
