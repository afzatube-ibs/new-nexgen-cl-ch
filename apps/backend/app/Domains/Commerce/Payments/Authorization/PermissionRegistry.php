<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Authorization;

/**
 * SECURITY:ROLES_PERMISSIONS' code-defined registry for this module — see
 * Identity & Access's identically-shaped class for the full rationale.
 * Synced into the database by database\Seeders\PaymentsPermissionSeeder.
 *
 * `payments.bank_transfer.verify` is kept separate from the general
 * `payments.payments.manage` permission deliberately: approving a manual
 * bank transfer is the one payment operation in this module with no
 * automated, gateway-verified counterpart at all — a human's word is the
 * entire basis for moving real money's worth of Order into `captured` —
 * so it is gated by its own, narrower grant an installation can hand out
 * separately from ordinary payment-management staff.
 */
final class PermissionRegistry
{
    /**
     * @return list<PermissionDefinition>
     */
    public static function definitions(): array
    {
        return [
            new PermissionDefinition('payments.payments.view', 'View payments and their attempt history', 'payments'),
            new PermissionDefinition('payments.payments.manage', 'Initiate, capture, cancel, and void payments', 'payments'),
            new PermissionDefinition('payments.bank_transfer.verify', 'Approve or reject manually reported bank transfers', 'payments'),
            new PermissionDefinition('payments.audit_log.view', "View Payments' audit log", 'payments'),
        ];
    }
}
