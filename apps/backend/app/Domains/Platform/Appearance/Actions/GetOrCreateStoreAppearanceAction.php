<?php

declare(strict_types=1);

namespace App\Domains\Platform\Appearance\Actions;

use App\Domains\Platform\Appearance\Models\StoreAppearance;
use App\Domains\Platform\StoreConfiguration\Models\Store;

/**
 * A store's own `StoreAppearance` row is created lazily, on first real
 * access — not at Store-creation time — so `StoreConfigurationServiceProvider`
 * never needs to know Appearance exists (`MODULE:PUBLIC_CONTRACT`'s own
 * "a module never depends on a module that depends on it" rule, applied
 * one layer further: Appearance depends on Store Configuration's `Store`
 * model, never the reverse). A brand-new store therefore always has a
 * real, honest, default-valued appearance the moment anything asks for it.
 */
final readonly class GetOrCreateStoreAppearanceAction
{
    public function execute(Store $store): StoreAppearance
    {
        return StoreAppearance::query()->firstOrCreate(['store_id' => $store->id]);
    }
}
