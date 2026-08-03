<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Authorization;

/**
 * The single source of truth for every permission Localization & Currency
 * itself declares — per SECURITY:ROLES_PERMISSIONS, "a module that adds a
 * new capability is responsible for defining the permission that guards
 * it." Mirrors the pattern Identity & Access's own PermissionRegistry
 * established (see that class's docblock for the full rationale, including
 * why this is code-defined rather than database-driven).
 *
 * These definitions are synced into Identity & Access's shared
 * `permissions` table by Database\Seeders\LocalizationPermissionSeeder —
 * the same cross-module integration point Identity & Access's own
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
            new PermissionDefinition('localization.locales.view', 'View locales', 'localization'),
            new PermissionDefinition('localization.locales.manage', 'Create, update, archive, and delete locales', 'localization'),
            new PermissionDefinition('localization.currencies.view', 'View currencies and exchange rates', 'localization'),
            new PermissionDefinition('localization.currencies.manage', 'Create, update, archive, and delete currencies and exchange rates', 'localization'),
            new PermissionDefinition('localization.audit_log.view', "View Localization & Currency's audit log", 'localization'),
        ];
    }
}
