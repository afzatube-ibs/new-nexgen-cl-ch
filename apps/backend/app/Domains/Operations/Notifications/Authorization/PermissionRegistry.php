<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Authorization;

/**
 * The single source of truth for every permission Notifications itself
 * declares — per SECURITY:ROLES_PERMISSIONS. Mirrors the pattern every
 * prior module's own PermissionRegistry established.
 *
 * `.templates.manage` is separated from `.notifications.manage` since
 * authoring what a notification says (a content/marketing concern) and
 * retrying/cancelling an individual delivery (an operational concern) are
 * different responsibilities in practice, mirroring Fulfillment's and
 * Returns' own precedent of separating adjacent-but-distinct
 * responsibilities into their own permission keys.
 */
final class PermissionRegistry
{
    /**
     * @return list<PermissionDefinition>
     */
    public static function definitions(): array
    {
        return [
            new PermissionDefinition('notifications.templates.view', 'View notification templates', 'notifications'),
            new PermissionDefinition('notifications.templates.manage', 'Create, update, and archive notification templates', 'notifications'),
            new PermissionDefinition('notifications.notifications.view', 'View notifications and their delivery status', 'notifications'),
            new PermissionDefinition('notifications.notifications.manage', 'Retry or cancel a notification', 'notifications'),
            new PermissionDefinition('notifications.audit_log.view', "View Notifications' audit log", 'notifications'),
        ];
    }
}
