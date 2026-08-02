<?php

use App\Domains\Platform\Foundation\Providers\FoundationServiceProvider;
use App\Domains\Platform\IdentityAccess\Providers\IdentityAccessServiceProvider;
use App\Providers\AppServiceProvider;

return [
    AppServiceProvider::class,
    FoundationServiceProvider::class,
    IdentityAccessServiceProvider::class,
];
