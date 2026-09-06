<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Actions;

use App\Domains\Platform\Cms\Models\CmsPage;
use Illuminate\Support\Facades\DB;

final readonly class UnpublishPageAction
{
    public function execute(CmsPage $page, int $expectedVersion, ?string $actorId): CmsPage
    {
        return DB::transaction(function () use ($page, $expectedVersion, $actorId): CmsPage {
            $page->assertVersionMatches($expectedVersion);
            $page->status = CmsPage::STATUS_DRAFT;
            $page->save();
            $page->revisions()->create(['snapshot' => $page->draftSnapshot(), 'created_by' => $actorId]);

            return $page->refresh();
        });
    }
}
