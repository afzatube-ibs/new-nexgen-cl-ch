<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Authorization;

final class PermissionRegistry
{
    /** @return list<PermissionDefinition> */
    public static function definitions(): array
    {
        return [
            new PermissionDefinition('cms.pages.view', 'View CMS drafts, pages, and revision history', 'cms'),
            new PermissionDefinition('cms.pages.manage', 'Create and edit CMS pages and drafts', 'cms'),
            new PermissionDefinition('cms.pages.publish', 'Publish or unpublish CMS pages', 'cms'),
            new PermissionDefinition('cms.published.view', 'Read published CMS content for Storefront composition', 'cms'),
        ];
    }
}
