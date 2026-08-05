<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Authorization;

/**
 * The single source of truth for every permission Fulfillment itself
 * declares — per SECURITY:ROLES_PERMISSIONS. Mirrors the pattern every
 * prior module's own PermissionRegistry established.
 *
 * Pick, pack, dispatch, and cancel are separated from the general
 * `.manage` permission (rather than folded into one, the way Shipping's
 * zones/methods/rates were) because real warehouse operations assign
 * these to distinct staff roles — a picker should not necessarily hold
 * dispatch authority, per SECURITY:ROLES_PERMISSIONS' least-privilege
 * intent.
 *
 * These definitions are synced into Identity & Access's shared
 * `permissions` table by Database\Seeders\FulfillmentPermissionSeeder —
 * the same cross-module integration point every prior module's own
 * PermissionRegistry docblock anticipates.
 */
final class PermissionRegistry
{
    /**
     * @return list<PermissionDefinition>
     */
    public static function definitions(): array
    {
        return [
            new PermissionDefinition('fulfillment.shipments.view', 'View shipments', 'fulfillment'),
            new PermissionDefinition('fulfillment.shipments.manage', 'Create shipments, manage items, destination, and notes', 'fulfillment'),
            new PermissionDefinition('fulfillment.shipments.pick', 'Start picking and mark a shipment picked', 'fulfillment'),
            new PermissionDefinition('fulfillment.shipments.pack', 'Start packing and mark a shipment packed', 'fulfillment'),
            new PermissionDefinition('fulfillment.shipments.dispatch', 'Dispatch a shipment, update transit status, and confirm delivery', 'fulfillment'),
            new PermissionDefinition('fulfillment.shipments.cancel', 'Cancel or mark a shipment failed', 'fulfillment'),
            new PermissionDefinition('fulfillment.audit_log.view', "View Fulfillment's audit log", 'fulfillment'),
        ];
    }
}
