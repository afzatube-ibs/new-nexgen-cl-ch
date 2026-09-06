<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Actions;

use App\Domains\Platform\Cms\Models\CmsPage;
use Illuminate\Support\Facades\DB;

final readonly class PublishPageAction
{
    public function execute(CmsPage $page, int $expectedVersion, ?string $actorId): CmsPage
    {
        return DB::transaction(function () use ($page, $expectedVersion, $actorId): CmsPage {
            $page->assertVersionMatches($expectedVersion);
            $page->published_snapshot = $page->draftSnapshot();
            $page->status = CmsPage::STATUS_PUBLISHED;
            $page->published_at = now();
            $page->published_by = $actorId;
            $page->save();
            $page->revisions()->create(['snapshot' => $page->draftSnapshot(), 'created_by' => $actorId]);

            return $page->refresh();
        });
    }
}
