<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Authorization;

/**
 * SECURITY:ROLES_PERMISSIONS' code-defined registry for this module — see
 * Identity & Access's identically-shaped class for the full rationale.
 * Synced into the database by database\Seeders\OrdersPermissionSeeder.
 */
final class PermissionRegistry
{
    /**
     * @return list<PermissionDefinition>
     */
    public static function definitions(): array
    {
        return [
            new PermissionDefinition('orders.orders.view', 'View orders, their items, addresses, discounts, and timeline', 'orders'),
            new PermissionDefinition('orders.orders.manage', 'Place orders and transition their status', 'orders'),
            new PermissionDefinition('orders.notes.manage', 'Add notes to orders', 'orders'),
            new PermissionDefinition('orders.audit_log.view', "View Orders' audit log", 'orders'),
        ];
    }
}
