<?php

namespace Database\Seeders;

use App\Domains\Platform\IdentityAccess\Models\Permission;
use App\Domains\Platform\IdentityAccess\Models\Role;
use Illuminate\Database\Seeder;

/**
 * Declarative least-privilege service roles used by the Store API Gateway.
 * The seeder creates roles only; real service-account users/tokens are still
 * provisioned per environment and never committed as default credentials.
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
            'cms.published.view',
            'pricing.lookup.view',
            'inventory.availability.view',
            'reviews.reviews.view',
        ]);

        $this->syncRole('checkout-service', 'Checkout Service (Gateway, Category-B guest checkout)', [
            'orders.orders.view',
            'checkout.sessions.view',
            'checkout.sessions.manage',
            // The Checkout Gateway must read the backend's available-only
            // payment-method catalog before presenting choices to a shopper.
            // This is read-only availability metadata; initiation remains
            // separately protected by payments.payments.manage below.
            'payments.payments.view',
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
