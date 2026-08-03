<?php

use App\Domains\Commerce\Catalog\Providers\CatalogServiceProvider;
use App\Domains\Commerce\Inventory\Providers\InventoryServiceProvider;
use App\Domains\Platform\Foundation\Providers\FoundationServiceProvider;
use App\Domains\Platform\IdentityAccess\Providers\IdentityAccessServiceProvider;
use App\Domains\Platform\Localization\Providers\LocalizationServiceProvider;
use App\Domains\Platform\Media\Providers\MediaServiceProvider;
use App\Domains\Platform\StoreConfiguration\Providers\StoreConfigurationServiceProvider;
use App\Providers\AppServiceProvider;

return [
    AppServiceProvider::class,
    FoundationServiceProvider::class,
    IdentityAccessServiceProvider::class,
    StoreConfigurationServiceProvider::class,
    MediaServiceProvider::class,
    CatalogServiceProvider::class,
    InventoryServiceProvider::class,
    LocalizationServiceProvider::class,
];
