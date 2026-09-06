<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Actions;

use App\Domains\Platform\Cms\Models\CmsPage;
use Illuminate\Support\Facades\DB;

final readonly class CreatePageAction
{
    /** @param array<string, mixed> $attributes */
    public function execute(string $storeId, array $attributes, ?string $actorId): CmsPage
    {
        return DB::transaction(function () use ($storeId, $attributes, $actorId): CmsPage {
            $page = CmsPage::query()->create(['store_id' => $storeId, ...$attributes]);
            $page->revisions()->create(['snapshot' => $page->draftSnapshot(), 'created_by' => $actorId]);

            return $page;
        });
    }
}
