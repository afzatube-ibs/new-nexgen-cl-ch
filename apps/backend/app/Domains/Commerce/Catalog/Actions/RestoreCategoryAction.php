<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Category;
use Illuminate\Support\Facades\DB;

final readonly class RestoreCategoryAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Category $category, ?string $actorId): Category
    {
        return DB::transaction(function () use ($category, $actorId) {
            $category->restore();

            $this->auditLogger->log(
                action: 'category.restored',
                actorId: $actorId,
                targetType: Category::class,
                targetId: $category->id,
                after: $category->only(['name', 'slug']),
            );

            return $category;
        });
    }
}
