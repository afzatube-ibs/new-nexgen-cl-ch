<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Exceptions\DependentRecordsExistException;
use App\Domains\Commerce\Catalog\Models\Category;
use Illuminate\Support\Facades\DB;

final readonly class DeleteCategoryAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Category $category, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($category, $expectedVersion, $actorId) {
            $category->assertVersionMatches($expectedVersion);

            if ($category->children()->exists()) {
                throw new DependentRecordsExistException(Category::class, $category->id, 'it still has child categories.');
            }

            // Detaching before delete makes the audit record's "before"
            // state explicit rather than relying on a reader inferring it
            // from the products migration's cascade — mirrors Identity &
            // Access's DeleteRoleAction.
            $affectedProductIds = $category->products()->pluck('products.id')->all();
            $category->products()->detach();

            $before = $category->only(['name', 'slug']) + ['affected_product_ids' => $affectedProductIds];
            $category->delete();

            $this->auditLogger->log(
                action: 'category.deleted',
                actorId: $actorId,
                targetType: Category::class,
                targetId: $category->id,
                before: $before,
            );
        });
    }
}
