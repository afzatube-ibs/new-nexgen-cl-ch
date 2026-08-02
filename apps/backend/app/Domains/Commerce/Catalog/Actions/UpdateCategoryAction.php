<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Category;
use App\Domains\Commerce\Catalog\Support\SlugGenerator;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

final readonly class UpdateCategoryAction
{
    private const array TRACKED_FIELDS = ['parent_id', 'name', 'slug', 'description', 'position', 'meta_title', 'meta_description'];

    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(Category $category, array $changes, int $expectedVersion, ?string $actorId): Category
    {
        return DB::transaction(function () use ($category, $changes, $expectedVersion, $actorId) {
            $category->assertVersionMatches($expectedVersion);

            if (array_key_exists('parent_id', $changes) && $changes['parent_id'] === $category->id) {
                throw new InvalidArgumentException('A category cannot be its own parent.');
            }

            if (array_key_exists('slug', $changes)) {
                $changes['slug'] = SlugGenerator::unique(
                    $changes['slug'],
                    Category::query()->whereKeyNot($category->id),
                );
            }

            $before = $category->only(self::TRACKED_FIELDS);
            $category->fill($changes)->save();
            $after = $category->only(self::TRACKED_FIELDS);

            $this->auditLogger->log(
                action: 'category.updated',
                actorId: $actorId,
                targetType: Category::class,
                targetId: $category->id,
                before: $before,
                after: $after,
            );

            return $category;
        });
    }
}
