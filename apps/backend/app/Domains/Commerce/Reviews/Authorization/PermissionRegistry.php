<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Authorization;

/**
 * The single source of truth for every permission Reviews itself declares
 * — per SECURITY:ROLES_PERMISSIONS, "a module that adds a new capability
 * is responsible for defining the permission that guards it." Mirrors the
 * pattern Identity & Access's own PermissionRegistry established.
 *
 * `reviews.reviews.view` also gates the real, public-facing listing the
 * Storefront reads through the Gateway's own fixed `storefront-service`
 * credential (the same Category-A pattern Catalog's own `products.view`
 * already uses) — a staff member holding it additionally sees every real
 * status (`pending`/`rejected`), not just `approved`, since the query
 * param that narrows to `approved` is applied by the caller, not a
 * separate permission.
 */
final class PermissionRegistry
{
    /**
     * @return list<PermissionDefinition>
     */
    public static function definitions(): array
    {
        return [
            new PermissionDefinition('reviews.reviews.view', 'View reviews', 'reviews'),
            new PermissionDefinition('reviews.reviews.moderate', 'Approve or reject submitted reviews', 'reviews'),
            new PermissionDefinition('reviews.reviews.manage', 'Delete reviews and respond as the merchant', 'reviews'),
            new PermissionDefinition('reviews.audit_log.view', "View Reviews' audit log", 'reviews'),
        ];
    }
}
