<?php

declare(strict_types=1);

namespace App\Domains\Operations\Shipping\Authorization;

/**
 * The single source of truth for every permission Shipping itself declares
 * — per SECURITY:ROLES_PERMISSIONS, "a module that adds a new capability
 * is responsible for defining the permission that guards it." Mirrors the
 * pattern every prior module's own PermissionRegistry established.
 *
 * These definitions are synced into Identity & Access's shared
 * `permissions` table by Database\Seeders\ShippingPermissionSeeder — the
 * same cross-module integration point every prior module's own
 * PermissionRegistry docblock anticipates.
 */
final class PermissionRegistry
{
    /**
     * @return list<PermissionDefinition>
     */
    public static function definitions(): array
    {
        return [
            new PermissionDefinition('shipping.zones.view', 'View shipping zones', 'shipping'),
            new PermissionDefinition('shipping.zones.manage', 'Create, update, archive, and delete shipping zones', 'shipping'),
            new PermissionDefinition('shipping.methods.view', 'View shipping methods', 'shipping'),
            new PermissionDefinition('shipping.methods.manage', 'Create, update, archive, and delete shipping methods', 'shipping'),
            new PermissionDefinition('shipping.rates.view', 'View shipping rates and calculate shipping cost', 'shipping'),
            new PermissionDefinition('shipping.rates.manage', 'Create, update, archive, and delete shipping rates', 'shipping'),
            new PermissionDefinition('shipping.providers.view', "View this installation's registered courier providers", 'shipping'),
            new PermissionDefinition('shipping.audit_log.view', "View Shipping's audit log", 'shipping'),
        ];
    }
}
