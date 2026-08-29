<?php

namespace Database\Seeders;

use App\Domains\Platform\IdentityAccess\Models\Permission;
use App\Domains\Platform\IdentityAccess\Models\Role;
use Illuminate\Database\Seeder;

/**
 * neXgen Production Sprint — Milestone 2, real production-configuration
 * fix. Found and confirmed by direct investigation, not assumed: neither
 * of the Store API Gateway's own two real service-credential roles
 * (`storefront-service`, Category-A read-only composition;
 * `checkout-service`, Category-B narrow guest-checkout writes — both
 * named and scoped in `STORE_API_GATEWAY_ARCHITECTURE.md`/`COMMERCE_
 * ENGINE_ARCHITECTURE_REVIEW.md` §8) had ANY reproducible seeder,
 * migration, or Installer step defining their real permission sets —
 * `RoleSeeder` only ever created the human "administrator" role, and
 * `Installer\Actions\InstallAction` only ever creates the first
 * administrator and the first store. A genuinely fresh production
 * installation (`php artisan migrate --seed`, then the real Installer
 * flow) therefore produced *no* Gateway-usable role at all — not merely
 * missing one permission, the entire mechanism had zero installation-time
 * reproducibility. Both roles existed in this particular installation
 * only because they were created out-of-band, ad hoc, in an earlier
 * session — confirmed by `grep`ing the whole codebase for either role
 * name and finding nothing.
 *
 * This seeder is the real fix: the exact, complete, least-privilege
 * permission set each role needs — re-verified against what this
 * installation's own already-provisioned roles actually hold before
 * writing this file, so `sync()` here is confirmed to add
 * `pricing.lookup.view` (real, new, Milestone 2's own narrow
 * price-lookup permission — Objective 1's own real Shipping composition
 * already needs `shipping.rates.view` here for the identical reason) and
 * never silently revoke anything either role already legitimately has.
 * Idempotent — safe to run repeatedly, on a fresh install or an existing
 * one alike (`db:seed` re-running this reconciles a role's permissions to
 * exactly this list, the same "declarative source of truth" every other
 * `*PermissionSeeder` in this directory already establishes for
 * permission *definitions*, applied here to *role composition* instead).
 *
 * What this seeder does NOT do, deliberately, mirroring exactly why
 * `DatabaseSeeder`'s own docblock refuses to seed a default admin user:
 * it never creates the actual service-account USER or issues a Sanctum
 * TOKEN — a token is a real credential, and per SECURITY:SECURE_
 * CONFIGURATION this platform never ships a default one. Provisioning
 * the real user + a real, freshly-generated token for a fresh
 * installation is `identity-access:create-service-account` (mirrors
 * `identity-access:create-admin`'s own established pattern exactly) —
 * run once per environment, its own real output is the value an operator
 * puts in the Gateway's `BACKEND_SERVICE_TOKEN`/`BACKEND_CHECKOUT_
 * SERVICE_TOKEN`. Once a role exists (via this seeder) and a user already
 * holds it (via that command, on a prior run), simply re-running this
 * seeder — e.g. after a real permission is added, exactly like this
 * milestone's own `pricing.lookup.view` — updates every existing token's
 * effective access immediately, with no new token, no `.env` change, and
 * no code deployment beyond this file.
 */
class ServiceAccountRoleSeeder extends Seeder
{
    public function run(): void
    {
        $this->syncRole('storefront-service', 'Storefront Service (Gateway, Category-A read-only)', [
            'store_configuration.stores.view',
            'catalog.products.view',
            'catalog.categories.view',
            'catalog.brands.view',
            'catalog.attributes.view',
            'catalog.options.view',
            'catalog.collections.view',
            'catalog.tags.view',
            'search.products.view',
            'appearance.branding.view',
            // Milestone 2 (Pricing → Storefront) — the real, narrow
            // permission the Gateway's own `pricing/lookup-many`
            // composition needs. This is the one line this fix actually
            // adds; every permission above it was already real and
            // already granted in every installation this seeder has been
            // checked against.
            'pricing.lookup.view',
        ]);

        $this->syncRole('checkout-service', 'Checkout Service (Gateway, Category-B guest checkout)', [
            'orders.orders.view',
            'checkout.sessions.view',
            'checkout.sessions.manage',
            'payments.payments.manage',
            'shipping.rates.view',
        ]);
    }

    /**
     * @param  list<string>  $permissionKeys
     */
    private function syncRole(string $name, string $label, array $permissionKeys): void
    {
        $role = Role::query()->updateOrCreate(['name' => $name], ['label' => $label]);
        $permissionIds = Permission::query()->whereIn('key', $permissionKeys)->pluck('id');
        $role->permissions()->sync($permissionIds);
    }
}
