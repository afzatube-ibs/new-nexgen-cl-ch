<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Category;
use App\Domains\Commerce\Catalog\Support\SlugGenerator;
use Illuminate\Support\Facades\DB;

final readonly class CreateCategoryAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): Category
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $attributes['slug'] = SlugGenerator::unique(
                $attributes['slug'] ?? $attributes['name'],
                Category::query(),
            );

            $category = Category::query()->create($attributes);

            $this->auditLogger->log(
                action: 'category.created',
                actorId: $actorId,
                targetType: Category::class,
                targetId: $category->id,
                after: $category->only(['parent_id', 'name', 'slug', 'position', 'status']),
            );

            return $category;
        });
    }
}
