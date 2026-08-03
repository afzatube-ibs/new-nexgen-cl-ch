<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Authorization;

/**
 * The single source of truth for every permission Pricing itself declares
 * — per SECURITY:ROLES_PERMISSIONS, "a module that adds a new capability
 * is responsible for defining the permission that guards it." Mirrors the
 * pattern Identity & Access's own PermissionRegistry established (see that
 * class's docblock for the full rationale, including why this is
 * code-defined rather than database-driven).
 *
 * Tax zones, classes, and rates share one `pricing.tax.*` pair rather than
 * three separate ones — they are one closely-related configuration
 * cluster typically managed by the same operator, mirroring Customers'
 * `customers.customers.manage` covering both Customer and its address
 * book together.
 *
 * These definitions are synced into Identity & Access's shared
 * `permissions` table by Database\Seeders\PricingPermissionSeeder — the
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
            new PermissionDefinition('pricing.price_lists.view', 'View price lists and pricing', 'pricing'),
            new PermissionDefinition('pricing.price_lists.manage', 'Create, update, archive, and delete price lists and pricing', 'pricing'),
            new PermissionDefinition('pricing.tax.view', 'View tax zones, classes, rates, and calculate tax', 'pricing'),
            new PermissionDefinition('pricing.tax.manage', 'Create, update, archive, and delete tax zones, classes, and rates', 'pricing'),
            new PermissionDefinition('pricing.audit_log.view', "View Pricing's audit log", 'pricing'),
        ];
    }
}
