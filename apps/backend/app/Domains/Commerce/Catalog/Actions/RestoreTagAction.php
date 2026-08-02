<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Tag;
use Illuminate\Support\Facades\DB;

final readonly class RestoreTagAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Tag $tag, ?string $actorId): Tag
    {
        return DB::transaction(function () use ($tag, $actorId) {
            $tag->restore();

            $this->auditLogger->log(
                action: 'tag.restored',
                actorId: $actorId,
                targetType: Tag::class,
                targetId: $tag->id,
                after: $tag->only(['name', 'slug']),
            );

            return $tag;
        });
    }
}
