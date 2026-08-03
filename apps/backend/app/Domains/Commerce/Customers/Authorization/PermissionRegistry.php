<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Customers\Authorization;

/**
 * The single source of truth for every permission Customers itself
 * declares — per SECURITY:ROLES_PERMISSIONS, "a module that adds a new
 * capability is responsible for defining the permission that guards it."
 * Mirrors the pattern Identity & Access's own PermissionRegistry
 * established (see that class's docblock for the full rationale, including
 * why this is code-defined rather than database-driven).
 *
 * Address-book mutations are gated by `customers.customers.manage`, not a
 * separate permission — Customer and its addresses are one aggregate (see
 * the customer_addresses migration's docblock), so they share one
 * authorization boundary.
 *
 * These definitions are synced into Identity & Access's shared
 * `permissions` table by Database\Seeders\CustomersPermissionSeeder — the
 * same cross-module integration point Identity & Access's own
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
            new PermissionDefinition('customers.customers.view', 'View customer accounts and address books', 'customers'),
            new PermissionDefinition('customers.customers.manage', 'Create, update, archive, and delete customer accounts and their addresses', 'customers'),
            new PermissionDefinition('customers.audit_log.view', "View Customers' audit log", 'customers'),
        ];
    }
}
