<?php

declare(strict_types=1);

namespace App\Domains\Platform\Media\Authorization;

/**
 * The single source of truth for every permission Media itself declares.
 * Synced into Identity & Access's shared `permissions` table by
 * Database\Seeders\MediaPermissionSeeder.
 */
final class PermissionRegistry
{
    /**
     * @return list<PermissionDefinition>
     */
    public static function definitions(): array
    {
        return [
            new PermissionDefinition('media.assets.view', 'View media assets', 'media'),
            new PermissionDefinition('media.assets.manage', 'Upload, update, delete, and restore media assets', 'media'),
            new PermissionDefinition('media.audit_log.view', "View Media's audit log", 'media'),
        ];
    }
}
