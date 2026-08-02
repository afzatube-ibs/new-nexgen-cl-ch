<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Tag;
use App\Domains\Commerce\Catalog\Support\SlugGenerator;
use Illuminate\Support\Facades\DB;

final readonly class CreateTagAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): Tag
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $attributes['slug'] = SlugGenerator::unique(
                $attributes['slug'] ?? $attributes['name'],
                Tag::query(),
            );

            $tag = Tag::query()->create($attributes);

            $this->auditLogger->log(
                action: 'tag.created',
                actorId: $actorId,
                targetType: Tag::class,
                targetId: $tag->id,
                after: $tag->only(['name', 'slug']),
            );

            return $tag;
        });
    }
}
