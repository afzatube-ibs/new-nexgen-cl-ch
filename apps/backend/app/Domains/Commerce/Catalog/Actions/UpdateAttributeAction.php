<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Attribute;
use Illuminate\Support\Facades\DB;

final readonly class UpdateAttributeAction
{
    private const array TRACKED_FIELDS = ['attribute_group_id', 'code', 'name', 'type', 'is_filterable', 'position'];

    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(Attribute $attribute, array $changes, int $expectedVersion, ?string $actorId): Attribute
    {
        return DB::transaction(function () use ($attribute, $changes, $expectedVersion, $actorId) {
            $attribute->assertVersionMatches($expectedVersion);

            $before = $attribute->only(self::TRACKED_FIELDS);
            $attribute->fill($changes)->save();
            $after = $attribute->only(self::TRACKED_FIELDS);

            $this->auditLogger->log(
                action: 'attribute.updated',
                actorId: $actorId,
                targetType: Attribute::class,
                targetId: $attribute->id,
                before: $before,
                after: $after,
            );

            return $attribute;
        });
    }
}
