<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Authorization;

/**
 * SECURITY:ROLES_PERMISSIONS' code-defined registry for this module — see
 * Identity & Access's identically-shaped class for the full rationale.
 * Synced into the database by database\Seeders\PromotionsPermissionSeeder.
 */
final class PermissionRegistry
{
    /**
     * @return list<PermissionDefinition>
     */
    public static function definitions(): array
    {
        return [
            new PermissionDefinition('promotions.promotions.view', 'View promotions and their conditions', 'promotions'),
            new PermissionDefinition('promotions.promotions.manage', 'Create, update, archive, and delete promotions and their conditions', 'promotions'),
            new PermissionDefinition('promotions.coupons.view', 'View coupon codes', 'promotions'),
            new PermissionDefinition('promotions.coupons.manage', 'Create, update, archive, and delete coupon codes', 'promotions'),
            new PermissionDefinition('promotions.redemptions.view', 'View promotion and coupon redemption records', 'promotions'),
            new PermissionDefinition('promotions.audit_log.view', "View Promotions' audit log", 'promotions'),
        ];
    }
}
