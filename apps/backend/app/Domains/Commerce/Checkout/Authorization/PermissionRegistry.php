<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Authorization;

/**
 * SECURITY:ROLES_PERMISSIONS' code-defined registry for this module — see
 * Identity & Access's identically-shaped class for the full rationale.
 * Synced into the database by database\Seeders\CheckoutPermissionSeeder.
 *
 * Gated behind staff `auth:sanctum` + `permission:`, exactly like every
 * other module's API surface so far, for the same reason Customers'
 * RegisterCustomerAction remains staff-initiated: no customer-facing
 * authentication guard exists yet on this platform (see that class's
 * docblock). A future storefront-facing Checkout surface, once one
 * exists, would be a new set of routes under a new guard, not a change
 * to this registry.
 */
final class PermissionRegistry
{
    /**
     * @return list<PermissionDefinition>
     */
    public static function definitions(): array
    {
        return [
            new PermissionDefinition('checkout.sessions.view', 'View checkout sessions', 'checkout'),
            new PermissionDefinition('checkout.sessions.manage', 'Start, modify, review, submit, and recover checkout sessions', 'checkout'),
            new PermissionDefinition('checkout.audit_log.view', "View Checkout's audit log", 'checkout'),
        ];
    }
}
