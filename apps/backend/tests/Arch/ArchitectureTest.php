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

// --- Pricing ---
//
// Unlike Customers, Pricing legitimately depends on Localization &
// Currency directly (its declared dependency per docs/04_MODULE_
// ARCHITECTURE.md's MODULE:PRICING entry and the master plan's "Catalog,
// Localization & Currency" — it reuses Localization's IsValidCurrencyCode
// rule rather than duplicating the ISO 4217 list a further time), so this
// block does not forbid that one Platform module the way it forbids every
// other sibling.

arch('Pricing never depends on Operations or Growth')
    ->expect('App\Domains\Commerce\Pricing')
    ->not->toUse(['App\Domains\Operations', 'App\Domains\Growth']);

arch('Pricing never depends on another Commerce module, or on Identity & Access, Store Configuration, or Media internals')
    ->expect('App\Domains\Commerce\Pricing')
    ->not->toUse([
        'App\Domains\Commerce\Catalog',
        'App\Domains\Commerce\Customers',
        'App\Domains\Commerce\Inventory',
        'App\Domains\Platform\IdentityAccess',
        'App\Domains\Platform\StoreConfiguration',
        'App\Domains\Platform\Media',
    ]);

arch('Pricing controllers are final')
    ->expect('App\Domains\Commerce\Pricing\Http\Controllers')
    ->classes()
    ->toBeFinal();

arch('Pricing actions are final and readonly')
    ->expect('App\Domains\Commerce\Pricing\Actions')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly();

arch('Pricing models are final')
    ->expect('App\Domains\Commerce\Pricing\Models')
    ->classes()
    ->toBeFinal();

arch('nothing in Pricing uses debugging leftovers')
    ->expect('App\Domains\Commerce\Pricing')
    ->not->toUse(['dd', 'dump', 'var_dump', 'die']);

arch('only Pricing\'s Actions coordinate DB transactions directly')
    ->expect('App\Domains\Commerce\Pricing')
    ->not->toUse('Illuminate\Support\Facades\DB')
    ->ignoring('App\Domains\Commerce\Pricing\Actions');

// --- Promotions ---
//
// Like Pricing, Promotions legitimately depends on Localization &
// Currency directly (reusing IsValidCurrencyCode rather than duplicating
// the ISO 4217 list a further time), so this block does not forbid that
// one Platform module. Unlike Pricing, Promotions has no legitimate
// direct code dependency on Pricing itself either — "Use Pricing instead
// of duplicating pricing logic" is satisfied by never looking up or
// recalculating a price, only ever adjusting the already-resolved unit
// prices a caller supplies via Support\CartContext (see that class's
// docblock) — so Pricing is forbidden here exactly like every other
// sibling Commerce module.

arch('Promotions never depends on Operations or Growth')
    ->expect('App\Domains\Commerce\Promotions')
    ->not->toUse(['App\Domains\Operations', 'App\Domains\Growth']);

arch('Promotions never depends on another Commerce module, or on Identity & Access, Store Configuration, or Media internals')
    ->expect('App\Domains\Commerce\Promotions')
    ->not->toUse([
        'App\Domains\Commerce\Catalog',
        'App\Domains\Commerce\Customers',
        'App\Domains\Commerce\Inventory',
        'App\Domains\Commerce\Pricing',
        'App\Domains\Platform\IdentityAccess',
        'App\Domains\Platform\StoreConfiguration',
        'App\Domains\Platform\Media',
    ]);

arch('Promotions controllers are final')
    ->expect('App\Domains\Commerce\Promotions\Http\Controllers')
    ->classes()
    ->toBeFinal();

arch('Promotions actions are final and readonly')
    ->expect('App\Domains\Commerce\Promotions\Actions')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly();

arch('Promotions models are final')
    ->expect('App\Domains\Commerce\Promotions\Models')
    ->classes()
    ->toBeFinal();

arch('nothing in Promotions uses debugging leftovers')
    ->expect('App\Domains\Commerce\Promotions')
    ->not->toUse(['dd', 'dump', 'var_dump', 'die']);

arch('only Promotions\' Actions coordinate DB transactions directly')
    ->expect('App\Domains\Commerce\Promotions')
    ->not->toUse('Illuminate\Support\Facades\DB')
    ->ignoring('App\Domains\Commerce\Promotions\Actions');

// --- Orders ---
//
// Unlike every sibling Commerce module so far, Orders has a real,
// legitimate code-level dependency on another Commerce module: Customers
// (see Actions\CreateOrderAction's docblock — it reads a Customer's live
// record once, at order-creation time, to freeze it into this module's
// own snapshot columns). This block allows that one dependency, plus
// Localization & Currency (reusing IsValidCurrencyCode, exactly as
// Pricing and Promotions already do), and forbids everything else,
// including Catalog, Pricing, and Promotions themselves — Orders never
// looks up a product, calculates a price, or evaluates a discount; it
// only records figures a caller already resolved (see the orders
// migration's docblock).

arch('Orders never depends on Operations or Growth')
    ->expect('App\Domains\Commerce\Orders')
    ->not->toUse(['App\Domains\Operations', 'App\Domains\Growth']);

arch('Orders never depends on Catalog, Inventory, Pricing, Promotions, Identity & Access, Store Configuration, or Media internals')
    ->expect('App\Domains\Commerce\Orders')
    ->not->toUse([
        'App\Domains\Commerce\Catalog',
        'App\Domains\Commerce\Inventory',
        'App\Domains\Commerce\Pricing',
        'App\Domains\Commerce\Promotions',
        'App\Domains\Platform\IdentityAccess',
        'App\Domains\Platform\StoreConfiguration',
        'App\Domains\Platform\Media',
    ]);

arch('Orders controllers are final')
    ->expect('App\Domains\Commerce\Orders\Http\Controllers')
    ->classes()
    ->toBeFinal();

arch('Orders actions are final and readonly')
    ->expect('App\Domains\Commerce\Orders\Actions')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly();

arch('Orders models are final')
    ->expect('App\Domains\Commerce\Orders\Models')
    ->classes()
    ->toBeFinal();

arch('nothing in Orders uses debugging leftovers')
    ->expect('App\Domains\Commerce\Orders')
    ->not->toUse(['dd', 'dump', 'var_dump', 'die']);

arch('only Orders\' Actions coordinate DB transactions directly')
    ->expect('App\Domains\Commerce\Orders')
    ->not->toUse('Illuminate\Support\Facades\DB')
    ->ignoring('App\Domains\Commerce\Orders\Actions');

// --- Checkout ---
//
// Unlike every module before it, Checkout's entire purpose is
// orchestration — calling Catalog, Inventory, Customers, Pricing,
// Promotions, and Orders' own public Actions directly is this module's
// normal, intended behavior, not a boundary violation (see Actions\
// SubmitCheckoutAction's and Actions\ReviewCheckoutAction's docblocks).
// This deny-list is correspondingly narrower than every sibling Commerce
// module's: it only forbids the Platform modules Checkout genuinely has
// no business reason to touch (Store Configuration, Media, Identity &
// Access internals — the `permission:` middleware and `auth:sanctum`
// guard it uses are wired platform-wide, not a direct class dependency).
// Localization & Currency remains allowed via the "Into Platform"
// exception, exercised the same way Pricing's and Promotions' own create
// requests already do (IsValidCurrencyCode).

arch('Checkout never depends on Operations or Growth')
    ->expect('App\Domains\Commerce\Checkout')
    ->not->toUse(['App\Domains\Operations', 'App\Domains\Growth']);

arch('Checkout never depends on Store Configuration, Media, or Identity & Access internals')
    ->expect('App\Domains\Commerce\Checkout')
    ->not->toUse([
        'App\Domains\Platform\StoreConfiguration',
        'App\Domains\Platform\Media',
        'App\Domains\Platform\IdentityAccess',
    ]);

arch('Checkout controllers are final')
    ->expect('App\Domains\Commerce\Checkout\Http\Controllers')
    ->classes()
    ->toBeFinal();

arch('Checkout actions are final and readonly')
    ->expect('App\Domains\Commerce\Checkout\Actions')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly();

arch('Checkout models are final')
    ->expect('App\Domains\Commerce\Checkout\Models')
    ->classes()
    ->toBeFinal();

arch('nothing in Checkout uses debugging leftovers')
    ->expect('App\Domains\Commerce\Checkout')
    ->not->toUse(['dd', 'dump', 'var_dump', 'die']);

arch('only Checkout\'s Actions coordinate DB transactions directly')
    ->expect('App\Domains\Commerce\Checkout')
    ->not->toUse('Illuminate\Support\Facades\DB')
    ->ignoring('App\Domains\Commerce\Checkout\Actions');

// --- Payments ---
//
// Payments' one real, legitimate code-level dependency is Orders (see
// Actions\InitiatePaymentAction's docblock — it reads an Order's live
// record once, at payment-initiation time, purely to snapshot
// grand_total/currency_code/customer_id, exactly mirroring Orders' own
// narrow, read-only dependency on Customers). This block forbids
// everything else, including Checkout — Payments processes payment ONLY
// for an Order that already exists; it has no business reason to touch
// an in-progress checkout session — and Catalog, Inventory, Pricing, and
// Promotions, which Payments MUST NOT duplicate the logic of (it never
// calculates a price, a tax, or a discount, and never manages stock).

arch('Payments never depends on Operations or Growth')
    ->expect('App\Domains\Commerce\Payments')
    ->not->toUse(['App\Domains\Operations', 'App\Domains\Growth']);

arch('Payments never depends on Catalog, Inventory, Pricing, Promotions, Checkout, Customers, Identity & Access, Store Configuration, or Media internals')
    ->expect('App\Domains\Commerce\Payments')
    ->not->toUse([
        'App\Domains\Commerce\Catalog',
        'App\Domains\Commerce\Inventory',
        'App\Domains\Commerce\Pricing',
        'App\Domains\Commerce\Promotions',
        'App\Domains\Commerce\Checkout',
        'App\Domains\Commerce\Customers',
        'App\Domains\Platform\IdentityAccess',
        'App\Domains\Platform\StoreConfiguration',
        'App\Domains\Platform\Media',
    ]);

arch('Payments controllers are final')
    ->expect('App\Domains\Commerce\Payments\Http\Controllers')
    ->classes()
    ->toBeFinal();

arch('Payments actions are final and readonly')
    ->expect('App\Domains\Commerce\Payments\Actions')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly();

arch('Payments models are final')
    ->expect('App\Domains\Commerce\Payments\Models')
    ->classes()
    ->toBeFinal();

arch('Payments gateways are final')
    ->expect('App\Domains\Commerce\Payments\Gateways')
    ->classes()
    ->toBeFinal()
    ->ignoring('App\Domains\Commerce\Payments\Gateways\Contracts');

arch('nothing in Payments uses debugging leftovers')
    ->expect('App\Domains\Commerce\Payments')
    ->not->toUse(['dd', 'dump', 'var_dump', 'die']);

arch('only Payments\' Actions coordinate DB transactions directly')
    ->expect('App\Domains\Commerce\Payments')
    ->not->toUse('Illuminate\Support\Facades\DB')
    ->ignoring('App\Domains\Commerce\Payments\Actions');

// --- Shipping ---
//
// Shipping is this platform's first Operations-domain module. Per
// MODULE:INTERACTION_RULES ("Across domains: interaction happens only
// through the domain event bus") and docs/04_MODULE_ARCHITECTURE.md's
// `MODULE:SHIPPING` entry ("owns shipping method configuration and rate
// information" only — shipment execution/tracking is the future
// Fulfillment module's responsibility), Shipping has NO code-level
// dependency on any Commerce module (Orders, Checkout, Payments included)
// — this deny-list is correspondingly the widest of any module's so far.
// Like every sibling, it may depend on Platform Foundation and, via the
// "Into Platform" exception, Localization & Currency directly (reusing
// IsValidCurrencyCode, exactly as Pricing, Promotions, and Orders already
// do).

arch('Shipping never depends on any Commerce module')
    ->expect('App\Domains\Operations\Shipping')
    ->not->toUse([
        'App\Domains\Commerce\Catalog',
        'App\Domains\Commerce\Inventory',
        'App\Domains\Commerce\Pricing',
        'App\Domains\Commerce\Promotions',
        'App\Domains\Commerce\Orders',
        'App\Domains\Commerce\Checkout',
        'App\Domains\Commerce\Payments',
        'App\Domains\Commerce\Customers',
    ]);

arch('Shipping never depends on Growth')
    ->expect('App\Domains\Operations\Shipping')
    ->not->toUse('App\Domains\Growth');

arch('Shipping never depends on Identity & Access, Store Configuration, or Media internals')
    ->expect('App\Domains\Operations\Shipping')
    ->not->toUse([
        'App\Domains\Platform\IdentityAccess',
        'App\Domains\Platform\StoreConfiguration',
        'App\Domains\Platform\Media',
    ]);

arch('Shipping controllers are final')
    ->expect('App\Domains\Operations\Shipping\Http\Controllers')
    ->classes()
    ->toBeFinal();

arch('Shipping actions are final and readonly')
    ->expect('App\Domains\Operations\Shipping\Actions')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly();

arch('Shipping models are final')
    ->expect('App\Domains\Operations\Shipping\Models')
    ->classes()
    ->toBeFinal();

arch('Shipping courier providers are final')
    ->expect('App\Domains\Operations\Shipping\Couriers')
    ->classes()
    ->toBeFinal()
    ->ignoring('App\Domains\Operations\Shipping\Couriers\Contracts');

arch('nothing in Shipping uses debugging leftovers')
    ->expect('App\Domains\Operations\Shipping')
    ->not->toUse(['dd', 'dump', 'var_dump', 'die']);

arch('only Shipping\'s Actions coordinate DB transactions directly')
    ->expect('App\Domains\Operations\Shipping')
    ->not->toUse('Illuminate\Support\Facades\DB')
    ->ignoring('App\Domains\Operations\Shipping\Actions');
