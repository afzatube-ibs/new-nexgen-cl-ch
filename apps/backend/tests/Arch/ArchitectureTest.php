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

// --- Catalog ---

arch('Catalog never depends on Operations or Growth')
    ->expect('App\Domains\Commerce\Catalog')
    ->not->toUse(['App\Domains\Operations', 'App\Domains\Growth']);

arch('Catalog never depends on Identity & Access or Store Configuration internals')
    ->expect('App\Domains\Commerce\Catalog')
    ->not->toUse(['App\Domains\Platform\IdentityAccess', 'App\Domains\Platform\StoreConfiguration']);

arch('Catalog controllers are final')
    ->expect('App\Domains\Commerce\Catalog\Http\Controllers')
    ->classes()
    ->toBeFinal();

arch('Catalog actions are final and readonly')
    ->expect('App\Domains\Commerce\Catalog\Actions')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly();

arch('Catalog models are final')
    ->expect('App\Domains\Commerce\Catalog\Models')
    ->classes()
    ->toBeFinal();

arch('nothing in Catalog uses debugging leftovers')
    ->expect('App\Domains\Commerce\Catalog')
    ->not->toUse(['dd', 'dump', 'var_dump', 'die']);

arch('only Catalog\'s Actions coordinate DB transactions directly')
    ->expect('App\Domains\Commerce\Catalog')
    ->not->toUse('Illuminate\Support\Facades\DB')
    ->ignoring('App\Domains\Commerce\Catalog\Actions');

// --- Media ---

arch('Media never depends on another domain')
    ->expect('App\Domains\Platform\Media')
    ->not->toUse(['App\Domains\Commerce', 'App\Domains\Operations', 'App\Domains\Growth']);

arch('Media never depends on another Platform module\'s internals')
    ->expect('App\Domains\Platform\Media')
    ->not->toUse(['App\Domains\Platform\IdentityAccess', 'App\Domains\Platform\StoreConfiguration']);

arch('Media controllers are final')
    ->expect('App\Domains\Platform\Media\Http\Controllers')
    ->classes()
    ->toBeFinal();

arch('Media actions are final and readonly')
    ->expect('App\Domains\Platform\Media\Actions')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly();

arch('Media models are final')
    ->expect('App\Domains\Platform\Media\Models')
    ->classes()
    ->toBeFinal();

arch('nothing in Media uses debugging leftovers')
    ->expect('App\Domains\Platform\Media')
    ->not->toUse(['dd', 'dump', 'var_dump', 'die']);

arch('only Media\'s Actions coordinate DB transactions directly')
    ->expect('App\Domains\Platform\Media')
    ->not->toUse('Illuminate\Support\Facades\DB')
    ->ignoring('App\Domains\Platform\Media\Actions');

// --- Inventory ---

arch('Inventory never depends on another domain')
    ->expect('App\Domains\Commerce\Inventory')
    ->not->toUse(['App\Domains\Operations', 'App\Domains\Growth']);

arch('Inventory never depends on another module\'s internals')
    ->expect('App\Domains\Commerce\Inventory')
    ->not->toUse([
        'App\Domains\Platform\IdentityAccess',
        'App\Domains\Platform\StoreConfiguration',
        'App\Domains\Platform\Media',
        'App\Domains\Commerce\Catalog',
    ]);

arch('Inventory controllers are final')
    ->expect('App\Domains\Commerce\Inventory\Http\Controllers')
    ->classes()
    ->toBeFinal();

arch('Inventory actions are final and readonly')
    ->expect('App\Domains\Commerce\Inventory\Actions')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly();

arch('Inventory models are final')
    ->expect('App\Domains\Commerce\Inventory\Models')
    ->classes()
    ->toBeFinal();

arch('nothing in Inventory uses debugging leftovers')
    ->expect('App\Domains\Commerce\Inventory')
    ->not->toUse(['dd', 'dump', 'var_dump', 'die']);

arch('only Inventory\'s Actions coordinate DB transactions directly')
    ->expect('App\Domains\Commerce\Inventory')
    ->not->toUse('Illuminate\Support\Facades\DB')
    ->ignoring('App\Domains\Commerce\Inventory\Actions');

// --- Localization & Currency ---

arch('Localization & Currency never depends on another domain')
    ->expect('App\Domains\Platform\Localization')
    ->not->toUse(['App\Domains\Commerce', 'App\Domains\Operations', 'App\Domains\Growth']);

arch('Localization & Currency never depends on another Platform module\'s internals')
    ->expect('App\Domains\Platform\Localization')
    ->not->toUse([
        'App\Domains\Platform\IdentityAccess',
        'App\Domains\Platform\StoreConfiguration',
        'App\Domains\Platform\Media',
    ]);

arch('Localization & Currency controllers are final')
    ->expect('App\Domains\Platform\Localization\Http\Controllers')
    ->classes()
    ->toBeFinal();

arch('Localization & Currency actions are final and readonly')
    ->expect('App\Domains\Platform\Localization\Actions')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly();

arch('Localization & Currency models are final')
    ->expect('App\Domains\Platform\Localization\Models')
    ->classes()
    ->toBeFinal();

arch('nothing in Localization & Currency uses debugging leftovers')
    ->expect('App\Domains\Platform\Localization')
    ->not->toUse(['dd', 'dump', 'var_dump', 'die']);

arch('only Localization & Currency\'s Actions coordinate DB transactions directly')
    ->expect('App\Domains\Platform\Localization')
    ->not->toUse('Illuminate\Support\Facades\DB')
    ->ignoring('App\Domains\Platform\Localization\Actions');

// --- Installer ---
//
// Unlike every module above, Installer legitimately depends on Identity &
// Access and Store Configuration directly (its declared dependencies per
// docs/04_MODULE_ARCHITECTURE.md and planning/IMPLEMENTATION_MASTER_PLAN.md
// — see Actions\InstallAction's docblock), so this block does not forbid
// those two the way every other module's block forbids its Platform
// siblings. It still forbids everything Installer has no declared
// relationship to.

arch('Installer never depends on another domain')
    ->expect('App\Domains\Platform\Installer')
    ->not->toUse(['App\Domains\Commerce', 'App\Domains\Operations', 'App\Domains\Growth']);

arch('Installer never depends on Media or Localization & Currency internals')
    ->expect('App\Domains\Platform\Installer')
    ->not->toUse(['App\Domains\Platform\Media', 'App\Domains\Platform\Localization']);

arch('Installer controllers are final')
    ->expect('App\Domains\Platform\Installer\Http\Controllers')
    ->classes()
    ->toBeFinal();

arch('Installer actions are final and readonly')
    ->expect('App\Domains\Platform\Installer\Actions')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly();

arch('Installer models are final')
    ->expect('App\Domains\Platform\Installer\Models')
    ->classes()
    ->toBeFinal();

arch('nothing in Installer uses debugging leftovers')
    ->expect('App\Domains\Platform\Installer')
    ->not->toUse(['dd', 'dump', 'var_dump', 'die']);

arch('only Installer\'s Actions coordinate DB transactions directly')
    ->expect('App\Domains\Platform\Installer')
    ->not->toUse('Illuminate\Support\Facades\DB')
    ->ignoring('App\Domains\Platform\Installer\Actions');

// --- Customers ---

arch('Customers never depends on Operations or Growth')
    ->expect('App\Domains\Commerce\Customers')
    ->not->toUse(['App\Domains\Operations', 'App\Domains\Growth']);

arch('Customers never depends on another Commerce module, or on Identity & Access or Store Configuration internals')
    ->expect('App\Domains\Commerce\Customers')
    ->not->toUse([
        'App\Domains\Commerce\Catalog',
        'App\Domains\Commerce\Inventory',
        'App\Domains\Platform\IdentityAccess',
        'App\Domains\Platform\StoreConfiguration',
        'App\Domains\Platform\Media',
        'App\Domains\Platform\Localization',
    ]);

arch('Customers controllers are final')
    ->expect('App\Domains\Commerce\Customers\Http\Controllers')
    ->classes()
    ->toBeFinal();

arch('Customers actions are final and readonly')
    ->expect('App\Domains\Commerce\Customers\Actions')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly();

arch('Customers models are final')
    ->expect('App\Domains\Commerce\Customers\Models')
    ->classes()
    ->toBeFinal();

arch('nothing in Customers uses debugging leftovers')
    ->expect('App\Domains\Commerce\Customers')
    ->not->toUse(['dd', 'dump', 'var_dump', 'die']);

arch('only Customers\' Actions coordinate DB transactions directly')
    ->expect('App\Domains\Commerce\Customers')
    ->not->toUse('Illuminate\Support\Facades\DB')
    ->ignoring('App\Domains\Commerce\Customers\Actions');
