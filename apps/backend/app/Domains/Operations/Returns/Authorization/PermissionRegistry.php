<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Authorization;

/**
 * The single source of truth for every permission Returns itself declares
 * — per SECURITY:ROLES_PERMISSIONS. Mirrors the pattern every prior
 * module's own PermissionRegistry established.
 *
 * `.inspect` and `.resolve` are separated from the general `.manage`
 * permission — mirrors Fulfillment's pick/pack/dispatch separation — since
 * real operations assign warehouse inspection and financial resolution
 * decisions to different roles; `.resolve` in particular gates the action
 * that triggers real money movement (refund) or committed inventory
 * (exchange), warranting its own narrower grant per SECURITY:
 * FRAUD_PROTECTION's "refund fraud is a direct financial risk."
 */
final class PermissionRegistry
{
    /**
     * @return list<PermissionDefinition>
     */
    public static function definitions(): array
    {
        return [
            new PermissionDefinition('returns.requests.view', 'View return, exchange, and refund requests', 'returns'),
            new PermissionDefinition('returns.requests.manage', 'Create return requests, manage items, pickup, and notes', 'returns'),
            new PermissionDefinition('returns.requests.approve', 'Approve or reject a return request', 'returns'),
            new PermissionDefinition('returns.requests.inspect', 'Mark a return received and record inspection', 'returns'),
            new PermissionDefinition('returns.requests.resolve', 'Resolve a return request as refund, exchange, or rejection', 'returns'),
            new PermissionDefinition('returns.requests.cancel', 'Cancel a return request', 'returns'),
            new PermissionDefinition('returns.audit_log.view', "View Returns' audit log", 'returns'),
        ];
    }
}
