<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Authorization;

/**
 * The single source of truth for every permission Catalog itself declares,
 * per SECURITY:ROLES_PERMISSIONS — mirrors the pattern Identity & Access's
 * own PermissionRegistry established. Synced into Identity & Access's
 * shared `permissions` table by
 * Database\Seeders\CatalogPermissionSeeder.
 */
final class PermissionRegistry
{
    /**
     * @return list<PermissionDefinition>
     */
    public static function definitions(): array
    {
        return [
            new PermissionDefinition('catalog.products.view', 'View products and variants', 'catalog'),
            new PermissionDefinition('catalog.products.manage', 'Create, update, publish, archive, and delete products and variants', 'catalog'),
            new PermissionDefinition('catalog.categories.view', 'View categories', 'catalog'),
            new PermissionDefinition('catalog.categories.manage', 'Create, update, archive, and delete categories', 'catalog'),
            new PermissionDefinition('catalog.brands.view', 'View brands', 'catalog'),
            new PermissionDefinition('catalog.brands.manage', 'Create, update, archive, and delete brands', 'catalog'),
            new PermissionDefinition('catalog.attributes.view', 'View attributes and attribute groups', 'catalog'),
            new PermissionDefinition('catalog.attributes.manage', 'Create, update, and delete attributes and attribute groups', 'catalog'),
            new PermissionDefinition('catalog.options.view', 'View options and option values', 'catalog'),
            new PermissionDefinition('catalog.options.manage', 'Create, update, and delete options and option values', 'catalog'),
            new PermissionDefinition('catalog.collections.view', 'View collections', 'catalog'),
            new PermissionDefinition('catalog.collections.manage', 'Create, update, archive, and delete collections', 'catalog'),
            new PermissionDefinition('catalog.tags.view', 'View tags', 'catalog'),
            new PermissionDefinition('catalog.tags.manage', 'Create, update, and delete tags', 'catalog'),
            new PermissionDefinition('catalog.audit_log.view', "View Catalog's audit log", 'catalog'),
        ];
    }
}
