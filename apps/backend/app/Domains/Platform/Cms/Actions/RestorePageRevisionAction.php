<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Actions;

use App\Domains\Platform\Cms\Models\CmsPage;
use App\Domains\Platform\Cms\Models\CmsPageRevision;
use Illuminate\Support\Facades\DB;

final readonly class RestorePageRevisionAction
{
    public function execute(CmsPage $page, CmsPageRevision $revision, int $expectedVersion, ?string $actorId): CmsPage
    {
        return DB::transaction(function () use ($page, $revision, $expectedVersion, $actorId): CmsPage {
            $page->assertVersionMatches($expectedVersion);
            abort_unless($revision->page_id === $page->id, 404);
            $page->fill($revision->snapshot)->save();
            $page->revisions()->create(['snapshot' => $page->draftSnapshot(), 'created_by' => $actorId]);

            return $page->refresh();
        });
    }
}
