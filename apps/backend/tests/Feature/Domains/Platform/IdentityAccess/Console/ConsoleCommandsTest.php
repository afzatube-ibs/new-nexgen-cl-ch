<?php

declare(strict_types=1);

use App\Domains\Platform\IdentityAccess\Authorization\PermissionRegistry;
use App\Domains\Platform\IdentityAccess\Models\Permission;
use App\Domains\Platform\IdentityAccess\Models\Role;
use App\Domains\Platform\IdentityAccess\Models\User;
use Database\Seeders\AppearancePermissionSeeder;
use Database\Seeders\CatalogPermissionSeeder;
use Database\Seeders\CheckoutPermissionSeeder;
use Database\Seeders\OrdersPermissionSeeder;
use Database\Seeders\PaymentsPermissionSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\PricingPermissionSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SearchPermissionSeeder;
use Database\Seeders\ServiceAccountRoleSeeder;
use Database\Seeders\ShippingPermissionSeeder;
use Database\Seeders\StoreConfigurationPermissionSeeder;
use Illuminate\Support\Facades\Artisan;

it('syncs every registry-declared permission into the database, idempotently', function () {
    $this->artisan('identity-access:sync-permissions')->assertSuccessful();

    expect(Permission::query()->count())->toBe(count(PermissionRegistry::definitions()));

    // Running it again must not duplicate or fail.
    $this->artisan('identity-access:sync-permissions')->assertSuccessful();

    expect(Permission::query()->count())->toBe(count(PermissionRegistry::definitions()));
});

it('refuses to create an admin before the administrator role exists', function () {
    $this->artisan('identity-access:create-admin', [
        '--name' => 'First Admin',
        '--email' => 'first-admin@nexgen.test',
        '--password' => 'Str0ng!Passw0rd#Boot',
    ])->assertFailed();

    expect(User::query()->where('email', 'first-admin@nexgen.test')->exists())->toBeFalse();
});

it('creates the first administrator with the Administrator role once seeded', function () {
    $this->seed(PermissionSeeder::class);
    $this->seed(RoleSeeder::class);

    $this->artisan('identity-access:create-admin', [
        '--name' => 'First Admin',
        '--email' => 'first-admin@nexgen.test',
        '--password' => 'Str0ng!Passw0rd#Boot',
    ])->assertSuccessful();

    $admin = User::query()->where('email', 'first-admin@nexgen.test')->firstOrFail();
    $role = Role::query()->where('name', 'administrator')->firstOrFail();

    expect($admin->roles()->whereKey($role->id)->exists())->toBeTrue();
    expect($admin->hasPermission('identity_access.users.manage'))->toBeTrue();
});

it('rejects a weak password when bootstrapping the first administrator', function () {
    $this->seed(PermissionSeeder::class);
    $this->seed(RoleSeeder::class);

    $this->artisan('identity-access:create-admin', [
        '--name' => 'First Admin',
        '--email' => 'first-admin@nexgen.test',
        '--password' => 'weak',
    ])->assertFailed();

    expect(User::query()->where('email', 'first-admin@nexgen.test')->exists())->toBeFalse();
});

/**
 * neXgen Production Sprint — Milestone 2, real production-configuration
 * fix. A genuinely fresh installation's own `db:seed` run — not a manual
 * grant — must produce a real `storefront-service` role already holding
 * `pricing.lookup.view` (and every other real permission it needs), and
 * a real `checkout-service` role with its own real, narrower set.
 */
it('seeds both real Store API Gateway service-account roles with their exact, complete permission sets on a fresh install', function () {
    $this->seed([
        CatalogPermissionSeeder::class,
        SearchPermissionSeeder::class,
        PricingPermissionSeeder::class,
        AppearancePermissionSeeder::class,
        StoreConfigurationPermissionSeeder::class,
        CheckoutPermissionSeeder::class,
        OrdersPermissionSeeder::class,
        PaymentsPermissionSeeder::class,
        ShippingPermissionSeeder::class,
    ]);

    $this->artisan('db:seed', ['--class' => ServiceAccountRoleSeeder::class])->assertSuccessful();

    $storefrontService = Role::query()->where('name', 'storefront-service')->firstOrFail();
    $checkoutService = Role::query()->where('name', 'checkout-service')->firstOrFail();

    expect($storefrontService->permissions()->pluck('key')->sort()->values()->all())->toBe([
        'appearance.branding.view',
        'catalog.attributes.view',
        'catalog.brands.view',
        'catalog.categories.view',
        'catalog.collections.view',
        'catalog.options.view',
        'catalog.products.view',
        'catalog.tags.view',
        'pricing.lookup.view',
        'search.products.view',
        'store_configuration.stores.view',
    ]);
    expect($checkoutService->permissions()->pluck('key')->sort()->values()->all())->toBe([
        'checkout.sessions.manage',
        'checkout.sessions.view',
        'orders.orders.view',
        'payments.payments.manage',
        'payments.payments.view',
        'shipping.rates.view',
    ]);
});

it('re-running the service-account role seeder is idempotent and never revokes an already-correct permission', function () {
    $this->seed([CatalogPermissionSeeder::class, SearchPermissionSeeder::class, PricingPermissionSeeder::class, AppearancePermissionSeeder::class, StoreConfigurationPermissionSeeder::class]);

    $this->seed(ServiceAccountRoleSeeder::class);
    $firstRun = Role::query()->where('name', 'storefront-service')->firstOrFail()->permissions()->pluck('key')->sort()->values()->all();

    $this->seed(ServiceAccountRoleSeeder::class);
    $secondRun = Role::query()->where('name', 'storefront-service')->firstOrFail()->permissions()->pluck('key')->sort()->values()->all();

    expect($secondRun)->toBe($firstRun);
});

it('refuses to create a service account for a role that has not been seeded yet', function () {
    $this->artisan('identity-access:create-service-account', ['role' => 'storefront-service'])->assertFailed();

    expect(User::query()->where('email', 'storefront-service@service.local')->exists())->toBeFalse();
});

it('provisions a real service account and issues a real Sanctum token once the role exists', function () {
    $this->seed([CatalogPermissionSeeder::class, SearchPermissionSeeder::class, PricingPermissionSeeder::class, AppearancePermissionSeeder::class, StoreConfigurationPermissionSeeder::class]);
    $this->seed(ServiceAccountRoleSeeder::class);

    $this->artisan('identity-access:create-service-account', ['role' => 'storefront-service'])
        ->expectsOutputToContain('Real Sanctum token issued')
        ->assertSuccessful();

    $user = User::query()->where('email', 'storefront-service@service.local')->firstOrFail();
    $role = Role::query()->where('name', 'storefront-service')->firstOrFail();

    expect($user->roles()->whereKey($role->id)->exists())->toBeTrue();
    expect($user->tokens()->count())->toBe(1);
    expect($user->hasPermission('pricing.lookup.view'))->toBeTrue();
});

it('outputs exactly one machine-readable token when token-only mode is requested', function () {
    $this->seed([CatalogPermissionSeeder::class, SearchPermissionSeeder::class, PricingPermissionSeeder::class, AppearancePermissionSeeder::class, StoreConfigurationPermissionSeeder::class]);
    $this->seed(ServiceAccountRoleSeeder::class);

    $exitCode = Artisan::call('identity-access:create-service-account', [
        'role' => 'storefront-service',
        '--token-only' => true,
    ]);
    $output = trim(Artisan::output());

    expect($exitCode)->toBe(0);
    expect($output)->toMatch('/^\d+\|\S+$/');
    expect($output)->not->toContain('Created service account user');
    expect($output)->not->toContain('Real Sanctum token issued');
});

it('reuses the existing service account user on a second run, rather than creating a duplicate', function () {
    $this->seed([CatalogPermissionSeeder::class, SearchPermissionSeeder::class, PricingPermissionSeeder::class, AppearancePermissionSeeder::class, StoreConfigurationPermissionSeeder::class]);
    $this->seed(ServiceAccountRoleSeeder::class);

    $this->artisan('identity-access:create-service-account', ['role' => 'storefront-service'])->assertSuccessful();
    $this->artisan('identity-access:create-service-account', ['role' => 'storefront-service'])->assertSuccessful();

    expect(User::query()->where('email', 'storefront-service@service.local')->count())->toBe(1);
    expect(User::query()->where('email', 'storefront-service@service.local')->firstOrFail()->tokens()->count())->toBe(2);
});
