<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Collection;
use App\Domains\Commerce\Catalog\Support\SlugGenerator;
use Illuminate\Support\Facades\DB;

final readonly class CreateCollectionAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): Collection
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $attributes['slug'] = SlugGenerator::unique(
                $attributes['slug'] ?? $attributes['name'],
                Collection::query(),
            );

            $collection = Collection::query()->create($attributes);

            $this->auditLogger->log(
                action: 'collection.created',
                actorId: $actorId,
                targetType: Collection::class,
                targetId: $collection->id,
                after: $collection->only(['name', 'slug', 'description', 'position', 'status']),
            );

            return $collection;
        });
    }
}
