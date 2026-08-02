<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Collection;
use App\Domains\Commerce\Catalog\Support\SlugGenerator;
use Illuminate\Support\Facades\DB;

final readonly class UpdateCollectionAction
{
    private const array TRACKED_FIELDS = ['name', 'slug', 'description', 'position'];

    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(Collection $collection, array $changes, int $expectedVersion, ?string $actorId): Collection
    {
        return DB::transaction(function () use ($collection, $changes, $expectedVersion, $actorId) {
            $collection->assertVersionMatches($expectedVersion);

            if (array_key_exists('slug', $changes)) {
                $changes['slug'] = SlugGenerator::unique(
                    $changes['slug'],
                    Collection::query()->whereKeyNot($collection->id),
                );
            }

            $before = $collection->only(self::TRACKED_FIELDS);
            $collection->fill($changes)->save();
            $after = $collection->only(self::TRACKED_FIELDS);

            $this->auditLogger->log(
                action: 'collection.updated',
                actorId: $actorId,
                targetType: Collection::class,
                targetId: $collection->id,
                before: $before,
                after: $after,
            );

            return $collection;
        });
    }
}
