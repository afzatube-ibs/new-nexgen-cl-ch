<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Exceptions\DependentRecordsExistException;
use App\Domains\Commerce\Catalog\Models\Attribute;
use App\Domains\Commerce\Catalog\Models\ProductAttributeValue;
use Illuminate\Support\Facades\DB;

final readonly class DeleteAttributeAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Attribute $attribute, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($attribute, $expectedVersion, $actorId) {
            $attribute->assertVersionMatches($expectedVersion);

            if (ProductAttributeValue::query()->where('attribute_id', $attribute->id)->exists()) {
                throw new DependentRecordsExistException(
                    Attribute::class,
                    $attribute->id,
                    'one or more products still carry a value for it.',
                );
            }

            $before = $attribute->only(['code', 'name']);
            $attribute->delete();

            $this->auditLogger->log(
                action: 'attribute.deleted',
                actorId: $actorId,
                targetType: Attribute::class,
                targetId: $attribute->id,
                before: $before,
            );
        });
    }
}
