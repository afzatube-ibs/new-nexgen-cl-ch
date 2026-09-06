<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Actions;

use App\Domains\Platform\Cms\Models\CmsPage;
use Illuminate\Support\Facades\DB;

final readonly class UpdatePageAction
{
    /** @param array<string, mixed> $changes */
    public function execute(CmsPage $page, array $changes, int $expectedVersion, ?string $actorId): CmsPage
    {
        return DB::transaction(function () use ($page, $changes, $expectedVersion, $actorId): CmsPage {
            $page->assertVersionMatches($expectedVersion);
            $page->fill($changes)->save();
            $page->revisions()->create(['snapshot' => $page->draftSnapshot(), 'created_by' => $actorId]);

            return $page->refresh();
        });
    }
}
