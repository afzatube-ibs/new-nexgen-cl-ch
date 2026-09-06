<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Actions;

use App\Domains\Platform\Cms\Models\CmsMenu;
use Illuminate\Support\Facades\DB;

final readonly class UpdateMenuAction
{
    /** @param array<string, mixed> $changes */
    public function execute(CmsMenu $menu, array $changes, int $expectedVersion): CmsMenu
    {
        return DB::transaction(function () use ($menu, $changes, $expectedVersion): CmsMenu {
            $menu->assertVersionMatches($expectedVersion);
            $menu->fill($changes)->save();

            return $menu->refresh();
        });
    }
}
