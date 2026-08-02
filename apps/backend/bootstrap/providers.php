<?php

use App\Domains\Platform\Foundation\Providers\FoundationServiceProvider;
use App\Domains\Platform\IdentityAccess\Providers\IdentityAccessServiceProvider;
use App\Domains\Platform\StoreConfiguration\Providers\StoreConfigurationServiceProvider;
use App\Providers\AppServiceProvider;

return [
    AppServiceProvider::class,
    FoundationServiceProvider::class,
    IdentityAccessServiceProvider::class,
    StoreConfigurationServiceProvider::class,
];
