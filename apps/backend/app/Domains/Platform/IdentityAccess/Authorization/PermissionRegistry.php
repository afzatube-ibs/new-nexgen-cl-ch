<?php

declare(strict_types=1);

namespace App\Domains\Platform\IdentityAccess\Authorization;

/**
 * The single source of truth for every permission Identity & Access itself
 * declares — per SECURITY:ROLES_PERMISSIONS, "a module that adds a new
 * capability is responsible for defining the permission that guards it."
 *
 * This registry is intentionally static/code-defined, not database-driven:
 * a permission corresponds to a real, enforced code path (a controller
 * action gated by `permission:` middleware), and the two must never drift
 * apart. Console\Commands\SyncPermissionsCommand is what makes these
 * definitions queryable/assignable from the admin surface, by upserting
 * them into the permissions table — this class is never queried directly
 * by anything outside this module's own boot/sync process.
 *
 * When a future module needs its own permissions, it defines its own
 * PermissionRegistry-shaped provider and registers it the same way this
 * one is registered in IdentityAccessServiceProvider — this class does not
 * attempt to enumerate every module's permissions on their behalf.
 */
final class PermissionRegistry
{
    /**
     * @return list<PermissionDefinition>
     */
    public static function definitions(): array
    {
        return [
            new PermissionDefinition('identity_access.users.view', 'View staff users', 'identity_access'),
            new PermissionDefinition('identity_access.users.manage', 'Create, update, archive, and delete staff users', 'identity_access'),
            new PermissionDefinition('identity_access.roles.view', 'View roles and their permissions', 'identity_access'),
            new PermissionDefinition('identity_access.roles.manage', 'Create, update, and delete roles; assign permissions to roles', 'identity_access'),
            new PermissionDefinition('identity_access.user_roles.manage', 'Assign and revoke roles on staff users', 'identity_access'),
            new PermissionDefinition('identity_access.sessions.manage', "Revoke another user's active sessions", 'identity_access'),
            new PermissionDefinition('identity_access.audit_log.view', "View Identity & Access's audit log", 'identity_access'),
        ];
    }
}
