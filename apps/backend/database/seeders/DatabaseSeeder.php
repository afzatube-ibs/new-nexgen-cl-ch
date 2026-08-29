<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Seeds only safe, credential-free catalog data — the permission registry,
 * the default Administrator role, and (Milestone 2's own real production-
 * configuration fix) the Store API Gateway's two real service-account
 * roles (`ServiceAccountRoleSeeder`) — a role and its permission set are
 * catalog data, not a credential. Deliberately does NOT create any User
 * for any of these roles: seeding a default account with a known
 * password (or a default Sanctum token) would violate SECURITY:SECURE_
 * CONFIGURATION if this ever ran against a real installation. The first
 * real admin account is created explicitly via `php artisan identity-
 * access:create-admin`; a real Gateway service account (a real user plus
 * a real, freshly-generated token) via `php artisan identity-access:
 * create-service-account` — both require operator-driven input precisely
 * because a seeder cannot safely generate either.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,
            StoreConfigurationPermissionSeeder::class,
            MediaPermissionSeeder::class,
            AppearancePermissionSeeder::class,
            CatalogPermissionSeeder::class,
            InventoryPermissionSeeder::class,
            LocalizationPermissionSeeder::class,
            CustomersPermissionSeeder::class,
            PricingPermissionSeeder::class,
            PromotionsPermissionSeeder::class,
            OrdersPermissionSeeder::class,
            CheckoutPermissionSeeder::class,
            PaymentsPermissionSeeder::class,
            ShippingPermissionSeeder::class,
            FulfillmentPermissionSeeder::class,
            ReturnsPermissionSeeder::class,
            NotificationsPermissionSeeder::class,
            SearchPermissionSeeder::class,
            RoleSeeder::class,
            ServiceAccountRoleSeeder::class,
            NotificationTemplateSeeder::class,
        ]);
    }
}
