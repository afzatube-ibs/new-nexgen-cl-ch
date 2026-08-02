<?php

declare(strict_types=1);

// A second, independent enforcement layer for ENGINEERING:DOMAIN_BOUNDARY_
// ENFORCEMENT alongside deptrac.yaml's static analysis — per SECURITY:
// DEFENSE_IN_DEPTH's logic ("no individual mechanism is permitted to be the
// platform's only defense"), applied here to code-quality gates: a rule
// expressed two independent ways is far less likely to silently stop being
// enforced because one tool's configuration drifted or broke.

arch('only the EventBus namespace may depend on Laravel\'s native event dispatcher')
    ->expect('Illuminate\Contracts\Events\Dispatcher')
    ->not->toBeUsed()
    ->ignoring('App\Domains\Platform\Foundation\EventBus');

arch('every domain event extends the platform\'s DomainEvent envelope')
    ->expect('App\Domains\Platform\Foundation\EventBus')
    ->classes()
    ->not->toBeAbstract()
    ->ignoring([
        'App\Domains\Platform\Foundation\EventBus\Contracts',
        'App\Domains\Platform\Foundation\EventBus\DomainEvent',
    ]);

arch('Platform Foundation never depends on another domain')
    ->expect('App\Domains\Platform\Foundation')
    ->not->toUse(['App\Domains\Commerce', 'App\Domains\Operations', 'App\Domains\Growth']);

arch('controllers are final')
    ->expect('App\Domains\Platform\Foundation\Http\Controllers')
    ->classes()
    ->toBeFinal();

arch('domain events never depend on Eloquent, keeping the event envelope a pure transport concern')
    ->expect('App\Domains\Platform\Foundation\EventBus')
    ->not->toUse('Illuminate\Database\Eloquent');

arch('nothing in Platform Foundation uses debugging leftovers')
    ->expect('App\Domains\Platform\Foundation')
    ->not->toUse(['dd', 'dump', 'var_dump', 'die']);

// --- Identity & Access ---

arch('Identity & Access never depends on another domain')
    ->expect('App\Domains\Platform\IdentityAccess')
    ->not->toUse(['App\Domains\Commerce', 'App\Domains\Operations', 'App\Domains\Growth']);

arch('Identity & Access controllers are final')
    ->expect('App\Domains\Platform\IdentityAccess\Http\Controllers')
    ->classes()
    ->toBeFinal();

arch('Identity & Access actions are final and readonly')
    ->expect('App\Domains\Platform\IdentityAccess\Actions')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly();

arch('Identity & Access models are final')
    ->expect('App\Domains\Platform\IdentityAccess\Models')
    ->classes()
    ->toBeFinal();

arch('nothing in Identity & Access uses debugging leftovers')
    ->expect('App\Domains\Platform\IdentityAccess')
    ->not->toUse(['dd', 'dump', 'var_dump', 'die']);

arch('only Identity & Access\'s Actions coordinate DB transactions directly')
    ->expect('App\Domains\Platform\IdentityAccess')
    ->not->toUse('Illuminate\Support\Facades\DB')
    ->ignoring('App\Domains\Platform\IdentityAccess\Actions');

// --- Store Configuration ---

arch('Store Configuration never depends on another domain')
    ->expect('App\Domains\Platform\StoreConfiguration')
    ->not->toUse(['App\Domains\Commerce', 'App\Domains\Operations', 'App\Domains\Growth']);

arch('Store Configuration controllers are final')
    ->expect('App\Domains\Platform\StoreConfiguration\Http\Controllers')
    ->classes()
    ->toBeFinal();

arch('Store Configuration actions are final and readonly')
    ->expect('App\Domains\Platform\StoreConfiguration\Actions')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly();

arch('Store Configuration models are final')
    ->expect('App\Domains\Platform\StoreConfiguration\Models')
    ->classes()
    ->toBeFinal();

arch('nothing in Store Configuration uses debugging leftovers')
    ->expect('App\Domains\Platform\StoreConfiguration')
    ->not->toUse(['dd', 'dump', 'var_dump', 'die']);

arch('only Store Configuration\'s Actions coordinate DB transactions directly')
    ->expect('App\Domains\Platform\StoreConfiguration')
    ->not->toUse('Illuminate\Support\Facades\DB')
    ->ignoring('App\Domains\Platform\StoreConfiguration\Actions');
