<?php

declare(strict_types=1);

namespace App\Domains\Platform\StoreConfiguration\Authorization;

/**
 * The single source of truth for every permission Store Configuration
 * itself declares — per SECURITY:ROLES_PERMISSIONS, "a module that adds a
 * new capability is responsible for defining the permission that guards
 * it." Mirrors the pattern Identity & Access's own PermissionRegistry
 * established (see that class's docblock for the full rationale,
 * including why this is code-defined rather than database-driven).
 *
 * These definitions are synced into Identity & Access's shared
 * `permissions` table by Database\Seeders\StoreConfigurationPermissionSeeder
 * — the same cross-module integration point Identity & Access's own
 * PermissionRegistry docblock anticipates for every future module.
 */
final class PermissionRegistry
{
    /**
     * @return list<PermissionDefinition>
     */
    public static function definitions(): array
    {
        return [
            new PermissionDefinition('store_configuration.stores.view', 'View store configuration', 'store_configuration'),
            new PermissionDefinition('store_configuration.stores.manage', 'Create, update, archive, and delete stores', 'store_configuration'),
            new PermissionDefinition('store_configuration.audit_log.view', "View Store Configuration's audit log", 'store_configuration'),
        ];
    }
}
