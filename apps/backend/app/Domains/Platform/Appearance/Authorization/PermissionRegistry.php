<?php

declare(strict_types=1);

namespace App\Domains\Platform\Appearance\Authorization;

/**
 * The single source of truth for every permission Appearance itself
 * declares — mirrors `StoreConfiguration\Authorization\PermissionRegistry`.
 *
 * Only the permissions this Pack's own real routes actually enforce are
 * defined here — `appearance.pages.*`, `appearance.themes.*`,
 * `appearance.menus.manage`, and `appearance.custom_code.manage` are named,
 * not yet defined, in `planning/architecture/
 * APPEARANCE_WORKSPACE_SPECIFICATION.md` §11, for the later Experience
 * Packs that build Theme Studio/Menus/Custom Code — adding an unused
 * permission now would be dead configuration no route enforces yet.
 */
final class PermissionRegistry
{
    /**
     * @return list<PermissionDefinition>
     */
    public static function definitions(): array
    {
        return [
            new PermissionDefinition('appearance.branding.view', "View a store's brand identity, colors, typography, and social/business info", 'appearance'),
            new PermissionDefinition('appearance.branding.manage', "Edit and publish a store's brand identity, colors, typography, and social/business info", 'appearance'),
            new PermissionDefinition('appearance.audit_log.view', "View Appearance's own audit log", 'appearance'),
        ];
    }
}
