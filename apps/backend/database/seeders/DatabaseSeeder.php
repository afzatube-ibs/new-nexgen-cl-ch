<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Seeds only safe, credential-free catalog data — the permission registry
 * and the default Administrator role. Deliberately does NOT create any
 * User: seeding a default account with a known password would violate
 * SECURITY:SECURE_CONFIGURATION if this ever ran against a real
 * installation. The first real admin account is created explicitly via
 * `php artisan identity-access:create-admin`, which requires an
 * interactively-supplied (or explicitly-flagged) password — see that
 * command's docblock.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,
            StoreConfigurationPermissionSeeder::class,
            MediaPermissionSeeder::class,
            CatalogPermissionSeeder::class,
            InventoryPermissionSeeder::class,
            LocalizationPermissionSeeder::class,
            RoleSeeder::class,
        ]);
    }
}
