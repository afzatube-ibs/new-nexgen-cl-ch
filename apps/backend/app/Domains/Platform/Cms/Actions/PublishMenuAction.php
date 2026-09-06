<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Actions;

use App\Domains\Platform\Cms\Models\CmsMenu;
use Illuminate\Support\Facades\DB;

final readonly class PublishMenuAction
{
    public function execute(CmsMenu $menu, int $expectedVersion, ?string $actorId): CmsMenu
    {
        return DB::transaction(function () use ($menu, $expectedVersion, $actorId): CmsMenu {
            $menu->assertVersionMatches($expectedVersion);
            $menu->published_snapshot = $menu->draftSnapshot();
            $menu->status = CmsMenu::STATUS_PUBLISHED;
            $menu->published_at = now();
            $menu->published_by = $actorId;
            $menu->save();

            return $menu->refresh();
        });
    }
}
