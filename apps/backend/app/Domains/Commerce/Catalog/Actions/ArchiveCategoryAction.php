<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Category;
use Illuminate\Support\Facades\DB;

final readonly class ArchiveCategoryAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Category $category, int $expectedVersion, ?string $actorId): Category
    {
        return DB::transaction(function () use ($category, $expectedVersion, $actorId) {
            $category->assertVersionMatches($expectedVersion);

            $before = ['status' => $category->status];
            $category->status = Category::STATUS_ARCHIVED;
            $category->save();

            $this->auditLogger->log(
                action: 'category.archived',
                actorId: $actorId,
                targetType: Category::class,
                targetId: $category->id,
                before: $before,
                after: ['status' => $category->status],
            );

            return $category;
        });
    }
}
