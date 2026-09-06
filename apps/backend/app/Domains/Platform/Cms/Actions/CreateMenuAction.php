<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Actions;

use App\Domains\Platform\Cms\Models\CmsMenu;

final readonly class CreateMenuAction
{
    /** @param array<string, mixed> $attributes */
    public function execute(string $storeId, array $attributes): CmsMenu
    {
        return CmsMenu::query()->create(['store_id' => $storeId, ...$attributes]);
    }
}
