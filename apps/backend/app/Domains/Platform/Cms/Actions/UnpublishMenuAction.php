<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Actions;

use App\Domains\Platform\Cms\Models\CmsMenu;
use Illuminate\Support\Facades\DB;

final readonly class UnpublishMenuAction
{
    public function execute(CmsMenu $menu, int $expectedVersion): CmsMenu
    {
        return DB::transaction(function () use ($menu, $expectedVersion): CmsMenu {
            $menu->assertVersionMatches($expectedVersion);
            $menu->status = CmsMenu::STATUS_DRAFT;
            $menu->save();

            return $menu->refresh();
        });
    }
}
