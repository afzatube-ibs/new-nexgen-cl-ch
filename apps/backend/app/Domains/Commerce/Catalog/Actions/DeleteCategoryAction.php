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

            // Deleting a category a live product still depends on used to
            // silently detach it — a published product's own "at least one
            // category" completeness gate could be left unsatisfied with no
            // warning at all. Blocking here, exactly like the sibling check
            // above (and like DeleteAttributeAction/DeleteOptionAction
            // already do for products still valuing an Attribute/Option),
            // is the fix: never remove a product relationship without the
            // merchant explicitly acknowledging it first (Organization tab,
            // or archive this category instead). Found via a Product Owner
            // acceptance audit of Phase 2.2 (2026-08-11).
            $productCount = $category->products()->count();
            if ($productCount > 0) {
                throw new DependentRecordsExistException(
                    Category::class,
                    $category->id,
                    "it is still assigned to {$productCount} product(s). Unassign it from those products (Organization tab), or archive this category instead.",
                );
            }

            $before = $category->only(['name', 'slug']);
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
