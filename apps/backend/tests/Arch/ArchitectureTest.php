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

// --- Fulfillment ---
//
// Unlike Shipping, Fulfillment has a real, legitimate code-level
// dependency on another Operations module: Shipping itself (Couriers\
// ProviderRegistry/Contracts\ShippingProviderContract, and a narrow,
// same-domain direct read of Shipping's own ShippingMethod model — see
// Actions\DispatchShipmentAction's docblock, mirroring Payments' own
// same-domain read of Orders' `grand_total`). This is exactly the "within
// the same domain, direct calls between modules are permitted" half of
// MODULE:INTERACTION_RULES — the forbidden half, enforced below, is any
// dependency on a Commerce or Growth module. Fulfillment also depends on
// Localization & Currency (Platform) via the "Into Platform" exception,
// reusing IsValidCurrencyCode exactly as Shipping, Pricing, Promotions,
// and Orders already do.

arch('Fulfillment never depends on any Commerce module')
    ->expect('App\Domains\Operations\Fulfillment')
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

arch('Fulfillment never depends on Growth')
    ->expect('App\Domains\Operations\Fulfillment')
    ->not->toUse('App\Domains\Growth');

arch('Fulfillment never depends on Identity & Access, Store Configuration, or Media internals')
    ->expect('App\Domains\Operations\Fulfillment')
    ->not->toUse([
        'App\Domains\Platform\IdentityAccess',
        'App\Domains\Platform\StoreConfiguration',
        'App\Domains\Platform\Media',
    ]);

arch('Fulfillment controllers are final')
    ->expect('App\Domains\Operations\Fulfillment\Http\Controllers')
    ->classes()
    ->toBeFinal();

arch('Fulfillment actions are final and readonly')
    ->expect('App\Domains\Operations\Fulfillment\Actions')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly();

arch('Fulfillment models are final')
    ->expect('App\Domains\Operations\Fulfillment\Models')
    ->classes()
    ->toBeFinal();

arch('nothing in Fulfillment uses debugging leftovers')
    ->expect('App\Domains\Operations\Fulfillment')
    ->not->toUse(['dd', 'dump', 'var_dump', 'die']);

arch('only Fulfillment\'s Actions coordinate DB transactions directly')
    ->expect('App\Domains\Operations\Fulfillment')
    ->not->toUse('Illuminate\Support\Facades\DB')
    ->ignoring('App\Domains\Operations\Fulfillment\Actions');

// --- Returns ---
//
// Like Fulfillment, Returns has a real, legitimate code-level dependency
// on another Operations module: Shipping's Couriers\ProviderRegistry (see
// Actions\SchedulePickupAction's docblock) — same-domain, permitted per
// MODULE:INTERACTION_RULES. docs/04_MODULE_ARCHITECTURE.md's own §6 names
// "Returns may call Fulfillment directly, both within Operations" as a
// legitimate example of that same same-domain allowance — this delivery
// does not exercise a Fulfillment dependency (no concrete need arose), so
// no rule below asserts its absence; unlike the Commerce boundary below,
// this is a permitted-but-unexercised allowance, not a forbidden one.
// Returns has NO direct dependency on any Commerce module at all,
// including Payments — the refund flow crosses into Payments exclusively
// through the domain event bus (Events\ReturnResolved out, Payments'
// PaymentRefunded back in), never a direct call, per this module's own
// accepted boundary text ("does not directly depend on Commerce
// modules"). Also depends on Localization & Currency (Platform) via the
// "Into Platform" exception, reusing IsValidCurrencyCode exactly as every
// other currency-accepting module already does.

arch('Returns never depends on any Commerce module')
    ->expect('App\Domains\Operations\Returns')
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

arch('Returns never depends on Growth')
    ->expect('App\Domains\Operations\Returns')
    ->not->toUse('App\Domains\Growth');

arch('Returns never depends on Identity & Access, Store Configuration, or Media internals')
    ->expect('App\Domains\Operations\Returns')
    ->not->toUse([
        'App\Domains\Platform\IdentityAccess',
        'App\Domains\Platform\StoreConfiguration',
        'App\Domains\Platform\Media',
    ]);

arch('Returns controllers are final')
    ->expect('App\Domains\Operations\Returns\Http\Controllers')
    ->classes()
    ->toBeFinal();

arch('Returns actions are final and readonly')
    ->expect('App\Domains\Operations\Returns\Actions')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly();

arch('Returns models are final')
    ->expect('App\Domains\Operations\Returns\Models')
    ->classes()
    ->toBeFinal();

arch('nothing in Returns uses debugging leftovers')
    ->expect('App\Domains\Operations\Returns')
    ->not->toUse(['dd', 'dump', 'var_dump', 'die']);

arch('only Returns\' Actions coordinate DB transactions directly')
    ->expect('App\Domains\Operations\Returns')
    ->not->toUse('Illuminate\Support\Facades\DB')
    ->ignoring('App\Domains\Operations\Returns\Actions');

// --- Notifications ---
//
// Notifications has NO direct dependency on any Commerce module at all —
// unlike Fulfillment and Returns, which each have one real, narrow
// same-domain Operations dependency (Shipping's ProviderRegistry), this
// module has no code-level dependency on any other module in any domain:
// every recipient it needs (an Order's own `customer_email`/
// `customer_name` snapshot, a ReturnRequest's `rma_number`) is resolved
// by the eight cross-domain listeners in app/Listeners/Send*.php, which
// sit outside this layer entirely (see the Cross-domain event-routing
// seam rule below) — Models\Notification's own docblock explains why
// `recipient`/`related_type`/`related_id` are plain snapshot columns,
// never a live cross-module read from inside this module itself.

arch('Notifications never depends on any Commerce module')
    ->expect('App\Domains\Operations\Notifications')
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

arch('Notifications never depends on any other Operations module')
    ->expect('App\Domains\Operations\Notifications')
    ->not->toUse([
        'App\Domains\Operations\Shipping',
        'App\Domains\Operations\Fulfillment',
        'App\Domains\Operations\Returns',
        'App\Domains\Operations\SupplierManagement',
    ]);

arch('Notifications never depends on Growth')
    ->expect('App\Domains\Operations\Notifications')
    ->not->toUse('App\Domains\Growth');

arch('Notifications never depends on Identity & Access, Store Configuration, or Media internals')
    ->expect('App\Domains\Operations\Notifications')
    ->not->toUse([
        'App\Domains\Platform\IdentityAccess',
        'App\Domains\Platform\StoreConfiguration',
        'App\Domains\Platform\Media',
    ]);

arch('Notifications controllers are final')
    ->expect('App\Domains\Operations\Notifications\Http\Controllers')
    ->classes()
    ->toBeFinal();

arch('Notifications actions are final and readonly')
    ->expect('App\Domains\Operations\Notifications\Actions')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly();

arch('Notifications models are final')
    ->expect('App\Domains\Operations\Notifications\Models')
    ->classes()
    ->toBeFinal();

arch('Notifications channel providers are final')
    ->expect('App\Domains\Operations\Notifications\Channels')
    ->classes()
    ->toBeFinal()
    ->ignoring('App\Domains\Operations\Notifications\Channels\Contracts');

arch('Notifications jobs are final')
    ->expect('App\Domains\Operations\Notifications\Jobs')
    ->classes()
    ->toBeFinal();

arch('nothing in Notifications uses debugging leftovers')
    ->expect('App\Domains\Operations\Notifications')
    ->not->toUse(['dd', 'dump', 'var_dump', 'die']);

arch('only Notifications\' Actions coordinate DB transactions directly')
    ->expect('App\Domains\Operations\Notifications')
    ->not->toUse('Illuminate\Support\Facades\DB')
    ->ignoring('App\Domains\Operations\Notifications\Actions');

// --- Cross-domain event-routing seam (app/Listeners) ---
//
// App\Listeners\CreateShipmentOnOrderPlaced is the one class in the
// codebase permitted to import both a Commerce event (OrderPlaced) and an
// Operations module's own Action (Fulfillment's) — see that class's own
// docblock for why. It intentionally sits outside every App\Domains\*
// layer deptrac.yaml and the arch rules above cover, exactly like
// bootstrap/providers.php already does for every module's ServiceProvider.
// This rule is the arch-test-layer confirmation of that same boundary:
// the translation stays paper-thin, never growing real business logic of
// its own. The eight Notifications listeners (Send*On*.php) live here for
// the identical reason.

arch('the cross-domain event-routing seam stays a thin translator, never gaining its own business logic')
    ->expect('App\Listeners')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly()
    ->not->toUse(['dd', 'dump', 'var_dump', 'die', 'Illuminate\Support\Facades\DB']);

// --- Search ---
//
// Unlike every module above, Search is Commerce, the same domain as its
// one real dependency (Catalog) — per docs/04_MODULE_ARCHITECTURE.md's
// v1.5 Change Log entry, this is a deliberate, documented departure from
// the cross-domain-listener pattern every prior module needed: Search's
// own Listeners\* classes live inside this module's own namespace, not
// app/Listeners, and are registered from its own Providers\
// SearchServiceProvider::boot(), not App\Providers\AppServiceProvider —
// because deptrac.yaml's layers are domain-level, a same-domain import
// (Search -> Catalog) is never flagged, so no neutral bridge is needed.

arch('Search never depends on any Commerce module other than Catalog')
    ->expect('App\Domains\Commerce\Search')
    ->not->toUse([
        'App\Domains\Commerce\Inventory',
        'App\Domains\Commerce\Pricing',
        'App\Domains\Commerce\Promotions',
        'App\Domains\Commerce\Orders',
        'App\Domains\Commerce\Checkout',
        'App\Domains\Commerce\Payments',
        'App\Domains\Commerce\Customers',
    ]);

arch('Search never depends on any Operations module')
    ->expect('App\Domains\Commerce\Search')
    ->not->toUse([
        'App\Domains\Operations\Shipping',
        'App\Domains\Operations\Fulfillment',
        'App\Domains\Operations\Returns',
        'App\Domains\Operations\Notifications',
        'App\Domains\Operations\SupplierManagement',
    ]);

arch('Search never depends on Growth')
    ->expect('App\Domains\Commerce\Search')
    ->not->toUse('App\Domains\Growth');

arch('Search never depends on Identity & Access, Store Configuration, or Media internals')
    ->expect('App\Domains\Commerce\Search')
    ->not->toUse([
        'App\Domains\Platform\IdentityAccess',
        'App\Domains\Platform\StoreConfiguration',
        'App\Domains\Platform\Media',
    ]);

arch('Search controllers are final')
    ->expect('App\Domains\Commerce\Search\Http\Controllers')
    ->classes()
    ->toBeFinal();

arch('Search actions are final and readonly')
    ->expect('App\Domains\Commerce\Search\Actions')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly();

arch('Search models are final')
    ->expect('App\Domains\Commerce\Search\Models')
    ->classes()
    ->toBeFinal();

arch('Search engines are final')
    ->expect('App\Domains\Commerce\Search\Engines')
    ->classes()
    ->toBeFinal()
    ->ignoring([
        'App\Domains\Commerce\Search\Engines\Contracts',
        'App\Domains\Commerce\Search\Engines\Support',
    ]);

arch('Search listeners are final and readonly')
    ->expect('App\Domains\Commerce\Search\Listeners')
    ->classes()
    ->toBeFinal()
    ->toBeReadonly();

arch('nothing in Search uses debugging leftovers')
    ->expect('App\Domains\Commerce\Search')
    ->not->toUse(['dd', 'dump', 'var_dump', 'die']);

arch('only Search\' Actions coordinate DB transactions directly')
    ->expect('App\Domains\Commerce\Search')
    ->not->toUse('Illuminate\Support\Facades\DB')
    ->ignoring('App\Domains\Commerce\Search\Actions');
