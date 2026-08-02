<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Attribute;
use Illuminate\Support\Facades\DB;

final readonly class RestoreAttributeAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Attribute $attribute, ?string $actorId): Attribute
    {
        return DB::transaction(function () use ($attribute, $actorId) {
            $attribute->restore();

            $this->auditLogger->log(
                action: 'attribute.restored',
                actorId: $actorId,
                targetType: Attribute::class,
                targetId: $attribute->id,
                after: $attribute->only(['code', 'name']),
            );

            return $attribute;
        });
    }
}
