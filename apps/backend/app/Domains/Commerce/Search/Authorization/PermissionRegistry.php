<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Search\Authorization;

/**
 * The single source of truth for every permission Search itself
 * declares — per SECURITY:ROLES_PERMISSIONS. Mirrors the pattern every
 * prior module's own PermissionRegistry established.
 *
 * "Permission-aware results" (this module's own scope requirement) is
 * enforced at the data layer by Actions\SearchProductsAction itself
 * (status/visibility are hardcoded, never caller-supplied — see that
 * Action's own docblock), not by these permission keys — `search.
 * products.view` gates whether a caller may search at all, the same
 * shape every other module's `.view` permission takes.
 */
final class PermissionRegistry
{
    /**
     * @return list<PermissionDefinition>
     */
    public static function definitions(): array
    {
        return [
            new PermissionDefinition('search.products.view', 'Search products', 'search'),
            new PermissionDefinition('search.index.manage', "Trigger a full rebuild of Search's product index", 'search'),
            new PermissionDefinition('search.audit_log.view', "View Search's audit log", 'search'),
        ];
    }
}
