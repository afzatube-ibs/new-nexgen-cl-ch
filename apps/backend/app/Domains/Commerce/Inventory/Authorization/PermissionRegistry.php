<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Authorization;

/**
 * The single source of truth for every permission Inventory itself
 * declares. Synced into Identity & Access's shared `permissions` table by
 * Database\Seeders\InventoryPermissionSeeder.
 */
final class PermissionRegistry
{
    /**
     * @return list<PermissionDefinition>
     */
    public static function definitions(): array
    {
        return [
            new PermissionDefinition('inventory.warehouses.view', 'View warehouses', 'inventory'),
            new PermissionDefinition('inventory.warehouses.manage', 'Create, update, archive, delete, and restore warehouses', 'inventory'),
            new PermissionDefinition('inventory.stock.view', 'View stock levels and movement history', 'inventory'),
            new PermissionDefinition('inventory.stock.manage', 'Adjust stock levels', 'inventory'),
            new PermissionDefinition('inventory.reservations.manage', 'Reserve, release, and commit stock reservations', 'inventory'),
            new PermissionDefinition('inventory.transfers.manage', 'Initiate, complete, and cancel stock transfers', 'inventory'),
            new PermissionDefinition('inventory.audit_log.view', "View Inventory's audit log", 'inventory'),
        ];
    }
}
