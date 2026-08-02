<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Tag;
use App\Domains\Commerce\Catalog\Support\SlugGenerator;
use Illuminate\Support\Facades\DB;

final readonly class UpdateTagAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(Tag $tag, array $changes, int $expectedVersion, ?string $actorId): Tag
    {
        return DB::transaction(function () use ($tag, $changes, $expectedVersion, $actorId) {
            $tag->assertVersionMatches($expectedVersion);

            if (array_key_exists('slug', $changes)) {
                $changes['slug'] = SlugGenerator::unique(
                    $changes['slug'],
                    Tag::query()->whereKeyNot($tag->id),
                );
            }

            $before = $tag->only(['name', 'slug']);
            $tag->fill($changes)->save();
            $after = $tag->only(['name', 'slug']);

            $this->auditLogger->log(
                action: 'tag.updated',
                actorId: $actorId,
                targetType: Tag::class,
                targetId: $tag->id,
                before: $before,
                after: $after,
            );

            return $tag;
        });
    }
}
